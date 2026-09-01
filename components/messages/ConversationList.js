'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import useSWR from 'swr';
import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '../../utils/supabase/client';
import { broadcastMessagesRead } from '@/app/hooks/useUnreadMessagesCount';
import { formatChatTimeAgo, parseSafeDate } from '@/utils/dateUtils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SearchBar from '../SearchBar';

const supabase = createClient();

const getMessagePreview = (content) => {
    if (!content) return 'No messages yet';
    if (typeof content !== 'string') return String(content);
    if (content.startsWith('http')) {
        if (/\.(mp4|webm|mov|m4v|3gp|ogg)(\?.*)?$/i.test(content)) {
            return '🎥 Video';
        }
        if (/\.(jpg|jpeg|png|gif|webp|svg|bmp|heic|heif)(\?.*)?$/i.test(content)) {
            return '📷 Photo';
        }
        if (/\.(mp3|wav|m4a|aac|opus)(\?.*)?$/i.test(content)) {
            return '🎵 Audio';
        }
        if (content.includes('chat-attachments') || content.includes('storage')) {
            return '📎 Attachment';
        }
    }
    return content;
};

const fetchConversations = async () => {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) return { user: null, conversations: [] };

        const { data: convs, error } = await supabase
            .from('conversations')
            .select('*')
            .contains('participants', [user.id])
            .order('updated_at', { ascending: false });

        let convsToProcess = [];
        if (error || !convs) {
            const { data: fallbackConvs } = await supabase.from('conversations').select('*').order('updated_at', { ascending: false });
            convsToProcess = (fallbackConvs || []).filter(c => Array.isArray(c.participants) && c.participants.includes(user.id));
        } else {
            convsToProcess = convs;
        }

        if (!convsToProcess || convsToProcess.length === 0) return { user, conversations: [] };

        const otherUserIds = [...new Set(convsToProcess.map(c => c.participants?.find(p => p !== user.id)).filter(Boolean))];
        const productIds = [...new Set(convsToProcess.map(c => c.product_id).filter(Boolean))];

        const [profilesResult, productsResult] = await Promise.all([
            otherUserIds.length > 0
                ? supabase.from('profiles').select('id, display_name, email, avatar_url').in('id', otherUserIds)
                : Promise.resolve({ data: [] }),
            productIds.length > 0
                ? supabase.from('products').select('id, title, image_url').in('id', productIds)
                : Promise.resolve({ data: [] })
        ]);

        const profilesMap = (profilesResult.data || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
        const productsMap = (productsResult.data || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});

        const enrichedConvs = await Promise.all(convsToProcess.map(async (c) => {
            const otherUserId = c.participants?.find(p => p !== user.id);
            try {
                const { data: msgs } = await supabase
                    .from('messages')
                    .select('content, created_at, sender_id, is_read')
                    .eq('conversation_id', c.id)
                    .order('created_at', { ascending: false })
                    .limit(20);

                const messageList = msgs || [];
                const lastMsg = messageList[0] || null;
                const unreadCount = messageList.filter(m => m.sender_id !== user.id && m.is_read !== true).length;

                return {
                    ...c,
                    otherUser: profilesMap[otherUserId] || { display_name: 'Unknown User', email: '', avatar_url: null },
                    product: productsMap[c.product_id] || null,
                    lastMessage: lastMsg,
                    unreadCount: unreadCount
                };
            } catch (err) {
                console.error('Error fetching messages for conversation', c.id, err);
                return {
                    ...c,
                    otherUser: profilesMap[otherUserId] || { display_name: 'Unknown User', email: '', avatar_url: null },
                    product: productsMap[c.product_id] || null,
                    lastMessage: null,
                    unreadCount: 0
                };
            }
        }));

        // Sort by the latest message timestamp (or conversation updated_at / created_at)
        enrichedConvs.sort((a, b) => {
            const timeA = parseSafeDate(a.lastMessage?.created_at || a.updated_at || a.created_at)?.getTime() || 0;
            const timeB = parseSafeDate(b.lastMessage?.created_at || b.updated_at || b.created_at)?.getTime() || 0;
            return timeB - timeA;
        });

        return { user, conversations: enrichedConvs };
    } catch (err) {
        console.error('fetchConversations error:', err);
        return { user: null, conversations: [] };
    }
};

export default function ConversationList() {
    const pathname = usePathname();
    const [searchQuery, setSearchQuery] = useState('');

    const { data, isLoading, mutate } = useSWR('conversations', fetchConversations, {
        revalidateOnFocus: true,
        revalidateOnMount: true,
        revalidateOnReconnect: true,
        dedupingInterval: 500,
    });

    const conversations = data?.conversations || [];

    // Handle local read broadcast from any opened chat
    useEffect(() => {
        const handleLocalRead = (event) => {
            const convId = event.detail?.conversationId;
            if (convId) {
                mutate((prev) => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        conversations: (prev.conversations || []).map(c => 
                            c.id === convId ? { ...c, unreadCount: 0 } : c
                        )
                    };
                }, false);
            }
            mutate();
        };

        window.addEventListener('kart:messages-read', handleLocalRead);
        return () => window.removeEventListener('kart:messages-read', handleLocalRead);
    }, [mutate]);

    // Real-time subscription that invalidates the SWR cache on new messages/conversations/read status changes
    useEffect(() => {
        const channel = supabase
            .channel('public:conversations')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => mutate())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => mutate())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [mutate]);

    const handleSelectConversation = useCallback((convId) => {
        broadcastMessagesRead(convId);
        mutate((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                conversations: (prev.conversations || []).map(c => 
                    c.id === convId ? { ...c, unreadCount: 0 } : c
                )
            };
        }, false);
    }, [mutate]);

    const filteredConversations = conversations.filter(conv =>
        conv.otherUser.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.lastMessage?.content?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const [pullDelta, setPullDelta] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const startY = useRef(0);
    const startX = useRef(0);
    const isEligible = useRef(false);
    const mainRef = useRef(null);

    const handleTouchStart = (e) => {
        if (isRefreshing || !mainRef.current) return;
        if (mainRef.current.scrollTop <= 0) {
            startY.current = e.touches[0].clientY;
            startX.current = e.touches[0].clientX;
            isEligible.current = true;
        } else {
            isEligible.current = false;
        }
    };

    const handleTouchMove = (e) => {
        if (!isEligible.current || isRefreshing || !mainRef.current) return;
        if (mainRef.current.scrollTop > 0) {
            isEligible.current = false;
            setPullDelta(0);
            setIsDragging(false);
            return;
        }

        const currentY = e.touches[0].clientY;
        const currentX = e.touches[0].clientX;
        const diffY = currentY - startY.current;
        const diffX = Math.abs(currentX - startX.current);

        if (diffY > 0 && diffY > diffX) {
            setIsDragging(true);
            const friction = 0.4;
            const newDelta = Math.min(diffY * friction, 90);
            setPullDelta(newDelta);
        } else if (diffY <= 0) {
            setPullDelta(0);
            setIsDragging(false);
        }
    };

    const handleTouchEnd = async () => {
        if (!isEligible.current || isRefreshing) return;
        isEligible.current = false;
        setIsDragging(false);

        if (pullDelta > 45) {
            setIsRefreshing(true);
            setPullDelta(45);
            try {
                await mutate();
            } finally {
                setTimeout(() => {
                    setIsRefreshing(false);
                    setPullDelta(0);
                }, 400);
            }
        } else {
            setPullDelta(0);
        }
    };

    return (
        <div
            className="bg-white dark:bg-[#242428] font-display antialiased flex flex-col overflow-hidden w-full"
            style={{ height: 'calc(100dvh - 4rem - max(66px, calc(50px + env(safe-area-inset-bottom, 0px))))' }}
        >
            <div className="max-w-[440px] w-full mx-auto flex flex-col h-full overflow-hidden">
                <header className="flex-none z-40 px-4 py-3 bg-white/95 dark:bg-[#242428]/95 backdrop-blur-md border-b border-gray-100/50 dark:border-gray-800/30">
                    {conversations.length > 0 ? (
                        <SearchBar
                            placeholder="Search conversations..."
                            showFilter={true}
                            hideFilter={true}
                            value={searchQuery}
                            onChange={setSearchQuery}
                            leftContent={
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-2">
                                    Messages
                                </h3>
                            }
                        />
                    ) : (
                        <div className="h-14 flex items-center px-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Messages
                            </h3>
                        </div>
                    )}
                </header>

                <div 
                    className="flex items-center justify-center overflow-hidden transition-all duration-200"
                    style={{ 
                        height: isRefreshing ? '45px' : `${pullDelta}px`,
                        opacity: Math.min(pullDelta / 35, 1)
                    }}
                >
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#1daddd]">
                        <div className={`size-4 border-2 border-[#1daddd] border-t-transparent rounded-full ${isRefreshing ? 'animate-spin' : ''}`} 
                             style={{ transform: !isRefreshing ? `rotate(${pullDelta * 4}deg)` : undefined }} />
                        <span>{isRefreshing ? 'Refreshing...' : pullDelta > 45 ? 'Release to refresh' : 'Pull to refresh'}</span>
                    </div>
                </div>

                <main 
                    ref={mainRef}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                    className="flex-1 overflow-y-auto overscroll-contain px-4 pt-2 pb-6 relative"
                >
                {searchQuery.trim() && (
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1 mb-3">
                        <span>
                            Found <strong className="text-slate-800 dark:text-slate-200">{filteredConversations.length}</strong> {filteredConversations.length === 1 ? 'conversation' : 'conversations'}
                        </span>
                        <button
                            onClick={() => setSearchQuery('')}
                            className="text-primary font-bold hover:underline"
                        >
                            Clear
                        </button>
                    </div>
                )}

                {isLoading ? (
                    <div className="flex flex-col gap-2 animate-pulse">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-[#232628]">
                                <div className="size-14 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
                                <div className="flex-1 flex flex-col gap-2">
                                    <div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded-full" />
                                    <div className="h-3 w-52 bg-gray-100 dark:bg-gray-800 rounded-full" />
                                </div>
                                <div className="h-3 w-8 bg-gray-100 dark:bg-gray-800 rounded-full" />
                            </div>
                        ))}
                    </div>
                ) : filteredConversations.length === 0 ? (
                    searchQuery.trim() ? (
                        <div className="text-center py-16 px-6">
                            <div className="size-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <DynamicLucideIcon name="search" className="text-slate-400 text-3xl" />
                            </div>
                            <h3 className="text-slate-900 dark:text-white font-bold mb-1">No matching messages</h3>
                            <p className="text-slate-500 text-sm mb-4">No conversations match &quot;{searchQuery}&quot;</p>
                            <button
                                onClick={() => setSearchQuery('')}
                                className="h-10 px-6 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-[0.98]"
                            >
                                Clear Search
                            </button>
                        </div>
                    ) : (
                        <div className="text-center py-12 px-6">
                            <div className="size-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <DynamicLucideIcon name="inbox" className="text-slate-400 text-3xl" />
                            </div>
                            <h3 className="text-slate-900 dark:text-white font-bold mb-1">No messages yet</h3>
                            <p className="text-slate-500 text-sm">When you contact a seller, your conversation will appear here.</p>
                        </div>
                    )
                ) : (
                    filteredConversations.map(conv => {
                        const isActive = pathname === `/dashboard/messages/${conv.id}`;
                        const isUnread = (conv.unreadCount || 0) > 0;
                        const lastTimestamp = conv.lastMessage?.created_at || conv.updated_at || conv.created_at;

                        return (
                            <Link 
                                key={conv.id} 
                                href={`/dashboard/messages/${conv.id}`} 
                                className="block no-underline"
                                onClick={() => handleSelectConversation(conv.id)}
                            >
                                <div className={`group relative flex items-center gap-4 p-4 mb-2 rounded-xl transition-all active:scale-[0.98] border border-gray-100 dark:border-gray-800 cursor-pointer ${isActive ? 'bg-gray-50 dark:bg-[#232628] shadow-sm' : isUnread ? 'bg-sky-50/40 dark:bg-sky-950/20 shadow-sm border-sky-100 dark:border-sky-900/30' : 'bg-white dark:bg-[#232628] shadow-sm hover:border-gray-200 dark:hover:border-gray-700'}`}>
                                    <div className="relative shrink-0">
                                        <div className="size-14 rounded-full bg-center bg-cover border-2 border-white dark:border-[#242428] shadow-sm overflow-hidden flex items-center justify-center bg-slate-200 dark:bg-slate-700">
                                            {conv.otherUser.avatar_url ? (
                                                 <img src={conv.otherUser.avatar_url} alt={conv.otherUser.display_name} className="w-full h-full object-cover" />
                                            ) : (
                                                 <span className="text-lg font-bold text-slate-500 uppercase">{conv.otherUser.display_name?.[0]}</span>
                                            )}
                                        </div>
                                        <div className="absolute bottom-0 right-0 size-3.5 bg-green-500 border-2 border-white dark:border-[#242428] rounded-full"></div>
                                    </div>
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className={`text-base truncate ${isUnread ? 'font-bold text-gray-900 dark:text-white' : 'font-semibold text-[#111618] dark:text-white'}`}>
                                                {conv.otherUser.display_name}
                                            </span>
                                            <span className={`text-[12px] ${isActive || isUnread ? 'font-semibold text-[#1daddd]' : 'font-normal text-[#5e7d87] dark:text-gray-500'}`}>
                                                {formatChatTimeAgo(lastTimestamp)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            <p className={`text-sm line-clamp-1 ${isUnread ? 'font-semibold text-gray-900 dark:text-gray-100' : isActive ? 'font-medium text-[#111618] dark:text-gray-300' : 'text-[#5e7d87] dark:text-gray-400'}`}>
                                                {getMessagePreview(conv.lastMessage?.content)}
                                            </p>
                                            {isUnread && (
                                                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white shadow-sm shrink-0">
                                                    {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                                                </span>
                                            )}
                                            {!isUnread && isActive && (
                                                <div className="size-2.5 bg-[#1daddd] rounded-full shrink-0 animate-pulse"></div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })
                )}

                {conversations.length > 0 && (
                    <div className="py-3 flex flex-col items-center">
                        <div className="w-12 h-1 bg-gray-200 dark:bg-gray-800 rounded-full mb-2"></div>
                        <p className="text-xs text-[#5e7d87] font-medium uppercase tracking-widest">End of Messages</p>
                    </div>
                )}
            </main>

            </div>
        </div>
    );
}
