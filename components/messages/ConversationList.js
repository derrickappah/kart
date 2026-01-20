'use client';
import { useEffect, useState } from 'react';
import { createClient } from '../../utils/supabase/client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function ConversationList() {
    const supabase = createClient();
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const pathname = usePathname();

    useEffect(() => {
        const fetchConversations = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                setUser(user);

                if (!user) {
                    setLoading(false);
                    return;
                }

                // Fetch conversation IDs and basic info first to isolate the 400 error source
                const { data: convs, error } = await supabase
                    .from('conversations')
                    .select('*')
                    .contains('participants', [user.id])
                    .order('updated_at', { ascending: false });

                if (error) {
                    console.error("DEBUG: Conversation fetch error:", error);
                    // Fallback to fetching all and filtering locally if .contains fails
                    const { data: allConvs, error: allErr } = await supabase
                        .from('conversations')
                        .select('*')
                        .order('updated_at', { ascending: false });

                    if (allErr) {
                        setLoading(false);
                        return;
                    }
                    const filtered = allConvs?.filter(c => c.participants?.includes(user.id)) || [];
                    processConversations(filtered, user);
                } else {
                    processConversations(convs, user);
                }
            } catch (err) {
                console.error("DEBUG: ConversationList fetch error:", err);
                setLoading(false);
            }
        };

        const processConversations = async (convsToProcess, currentUser) => {
            if (convsToProcess && convsToProcess.length > 0 && currentUser) {
                const enrichedConvs = await Promise.all(convsToProcess.map(async (c) => {
                    const otherUserId = c.participants?.find(p => p !== currentUser.id);

                    let profile = null;
                    if (otherUserId) {
                        const { data: p } = await supabase
                            .from('profiles')
                            .select('display_name, email, avatar_url')
                            .eq('id', otherUserId)
                            .maybeSingle();
                        profile = p;
                    }

                    // Fetch product details separately
                    let productData = null;
                    if (c.product_id) {
                        const { data: p } = await supabase
                            .from('products')
                            .select('title, image_url')
                            .eq('id', c.product_id)
                            .maybeSingle();
                        productData = p;
                    }

                    const { data: lastMsg } = await supabase
                        .from('messages')
                        .select('content, created_at')
                        .eq('conversation_id', c.id)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    return {
                        ...c,
                        otherUser: profile || { display_name: 'Unknown User', email: '', avatar_url: null },
                        lastMessage: lastMsg,
                        product: productData
                    };
                }));
                setConversations(enrichedConvs);
            }
            setLoading(false);
        };

        fetchConversations();
    }, [supabase]);

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



    return (
        <div className="flex flex-col h-full bg-white dark:bg-[#242428] font-display overflow-hidden">
            <header className="flex-none sticky top-0 bg-[#fbfaf9]/80 dark:bg-[#1b1b1d]/80 backdrop-blur-md px-6 pt-6 pb-4 z-30">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex flex-col">
                        <h1 className="text-3xl font-bold tracking-tight text-[#0e181b] dark:text-white">Messages</h1>
                    </div>
                    <button className="flex items-center justify-center size-11 rounded-full bg-[#F3F1ED] dark:bg-[#2a2a2c] text-[#0e181b] dark:text-white transition-colors hover:bg-gray-200">
                        <span className="material-symbols-outlined text-[24px]">edit_square</span>
                    </button>
                </div>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-[#7A8493] text-[20px]">search</span>
                    </div>
                    <input
                        className="w-full h-12 pl-12 pr-4 bg-[#F3F1ED] dark:bg-[#2a2a2c] border-none rounded-xl focus:ring-2 focus:ring-[#1daddd]/40 text-sm font-medium placeholder:text-[#7A8493] dark:placeholder:text-gray-500"
                        placeholder="Search conversations..."
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </header>

            <main className="flex-1 px-4 pt-2 pb-24 overflow-y-auto no-scrollbar">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center p-8 text-slate-400 mt-12">
                        <div className="animate-pulse flex flex-col items-center gap-2">
                            <span className="material-symbols-outlined text-4xl">chat_bubble</span>
                            <p className="text-sm font-medium">Loading inbox...</p>
                        </div>
                    </div>
                ) : filteredConversations.length === 0 ? (
                    <div className="text-center py-12 px-6">
                        <div className="size-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-slate-400 text-3xl">inbox</span>
                        </div>
                        <h3 className="text-slate-900 dark:text-white font-bold mb-1">No messages yet</h3>
                        <p className="text-slate-500 text-sm">When you contact a seller, your conversation will appear here.</p>
                    </div>
                ) : (
                    filteredConversations.map(conv => {
                        const isActive = pathname === `/dashboard/messages/${conv.id}`;
                        return (
                            <Link key={conv.id} href={`/dashboard/messages/${conv.id}`} className="block no-underline">
                                <div className={`group relative flex items-center gap-4 p-4 mb-2 rounded-xl transition-all active:scale-[0.98] hover:bg-white dark:hover:bg-white/5 cursor-pointer ${isActive ? 'bg-white dark:bg-white/10 shadow-sm' : ''}`}>
                                    <div className="relative shrink-0">
                                        <div className="size-14 rounded-full bg-center bg-cover border-2 border-white dark:border-gray-800 shadow-sm overflow-hidden flex items-center justify-center bg-slate-200 dark:bg-slate-700">
                                            {conv.otherUser.avatar_url ? (
                                                <img src={conv.otherUser.avatar_url} alt={conv.otherUser.display_name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-lg font-bold text-slate-500 uppercase">{conv.otherUser.display_name?.[0]}</span>
                                            )}
                                        </div>
                                        <div className="absolute bottom-0 right-0 size-3.5 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></div>
                                    </div>
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className="text-base font-semibold text-[#0e181b] dark:text-white truncate">{conv.otherUser.display_name}</span>
                                            <span className={`text-[12px] ${isActive ? 'font-semibold text-[#1daddd]' : 'font-normal text-[#7A8493] dark:text-gray-500'}`}>
                                                {timeAgo(conv.updated_at)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            <p className={`text-sm line-clamp-1 ${isActive ? 'font-medium text-[#303640] dark:text-gray-300' : 'text-[#7A8493] dark:text-gray-400'}`}>
                                                {conv.lastMessage?.content || 'No messages yet'}
                                            </p>
                                            {isActive && (
                                                <div className="size-2.5 bg-[#1daddd] rounded-full shrink-0 animate-pulse"></div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })
                )}

                <div className="py-8 flex flex-col items-center">
                    <div className="w-12 h-1 bg-gray-200 dark:bg-gray-800 rounded-full mb-4"></div>
                    <p className="text-xs text-[#7A8493] font-medium uppercase tracking-widest">End of Messages</p>
                </div>
            </main>


        </div>
    );
}
