'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import useSWR from 'swr';
import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '../../utils/supabase/client';
import { broadcastMessagesRead } from '@/app/hooks/useUnreadMessagesCount';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SearchBar from '../SearchBar';

const supabase = createClient();

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

    const timeAgo = (date) => {
        if (!date) return '';
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + "y";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + "mo";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + "d";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "h";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "m";
        return Math.floor(seconds) + "s";
    };

    const filteredConversations = conversations.filter(conv =>
        conv.otherUser.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.lastMessage?.content?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const [pullDelta, setPullDelta] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isPulling, setIsPulling] = useState(false);
    const startY = useRef(0);
    const mainRef = useRef(null);

    const handleTouchStart = (e) => {
        if (isRefreshing || !mainRef.current) return;
        if (mainRef.current.scrollTop <= 0) {
            startY.current = e.touches[0].clientY;
            setIsPulling(true);
        } else {
            setIsPulling(false);
        }
    };

    const handleTouchMove = (e) => {
        if (!isPulling || isRefreshing || !mainRef.current) return;
        if (mainRef.current.scrollTop > 0) {
            setIsPulling(false);
            setPullDelta(0);
            return;
        }
        const currentY = e.touches[0].clientY;
        const diff = currentY - startY.current;
        if (diff > 0) {
            const delta = Math.min(diff * 0.4, 65);
            setPullDelta(delta);
        } else {
            setPullDelta(0);
        }
    };

    const handleTouchEnd = async () => {
        if (!isPulling) return;
        setIsPulling(false);
        if (pullDelta >= 45 && !isRefreshing) {
            setIsRefreshing(true);
            setPullDelta(45);
            try {
                await mutate();
            } finally {
                setTimeout(() => {
                    setIsRefreshing(false);
                    setPullDelta(0);
                }, 300);
            }
        } else {
            setPullDelta(0);
        }
    };

    return (
        <div className="bg-white dark:bg-[#242428] font-display antialiased flex flex-col h-full w-full overflow-hidden">
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

                <main 
                    ref={mainRef}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                    className="flex-1 overflow-y-auto overscroll-contain px-4 pt-2 pb-6 relative"
                >
                    {/* Inline Pull To Refresh Indicator */}
                    {(pullDelta > 0 || isRefreshing) && (
                        <div 
                            className="flex justify-center items-center py-2 transition-all duration-200"
                            style={{ height: `${pullDelta}px`, opacity: pullDelta > 15 || isRefreshing ? 1 : 0 }}
                        >
                            <div className="size-8 rounded-full bg-white dark:bg-[#2d2d32] shadow-md border border-gray-200 dark:border-gray-700 flex items-center justify-center text-[#1daddd]">
                                {isRefreshing ? (
                                    <div className="size-4 border-2 border-[#1daddd] border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <DynamicLucideIcon 
                                        name="arrow_downward" 
                                        size={18}
                                        style={{ 
                                            transform: `rotate(${Math.min((pullDelta / 45) * 180, 180)}deg)`,
                                            transition: 'transform 0.15s ease'
                                        }} 
                                        className="text-[#1daddd]"
                                    />
                                )}
                            </div>
                        </div>
                    )}
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
                                                {timeAgo(conv.updated_at)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            <p className={`text-sm line-clamp-1 ${isUnread ? 'font-semibold text-gray-900 dark:text-gray-100' : isActive ? 'font-medium text-[#111618] dark:text-gray-300' : 'text-[#5e7d87] dark:text-gray-400'}`}>
                                                {conv.lastMessage?.content || 'No messages yet'}
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
