'use client';
import { useEffect, useState, useRef } from 'react';
import { createClient } from '../../../../utils/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ChatPage() {
    const { id: conversationId } = useParams();
    const supabase = createClient();
    const router = useRouter();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [otherUser, setOtherUser] = useState(null);
    const [productContext, setProductContext] = useState(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }
            setCurrentUser(user);

            // Fetch conversation details to get other participant and potential product context
            const { data: conversation } = await supabase
                .from('conversations')
                .select('*')
                .eq('id', conversationId)
                .contains('participants', [user.id])
                .maybeSingle();

            if (conversation) {
                // Fetch product details separately if product_id exists
                if (conversation.product_id) {
                    const { data: prod } = await supabase
                        .from('products')
                        .select('*')
                        .eq('id', conversation.product_id)
                        .maybeSingle();
                    setProductContext(prod);
                }
                
                const otherParticipantId = conversation.participants.find(p => p !== user.id);
                
                // Fetch other user's profile
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', otherParticipantId)
                    .maybeSingle();
                setOtherUser(profile);
            }

            // Fetch initial messages
            const { data: initialMessages } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true });

            if (initialMessages) setMessages(initialMessages);

            // Subscribe to new messages
            const channel = supabase
                .channel(`room:${conversationId}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversationId}`
                }, (payload) => {
                    setMessages(prev => [...prev, payload.new]);
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        };

        init();
    }, [conversationId, router, supabase]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUser) return;

        const { error } = await supabase
            .from('messages')
            .insert([
                {
                    conversation_id: conversationId,
                    sender_id: currentUser.id,
                    content: newMessage
                }
            ]);

        if (error) console.error("Error sending message:", error);
        else {
            setNewMessage('');
            await supabase
                .from('conversations')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', conversationId);
        }
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-[#f6f7f8] dark:bg-[#131b1f] text-gray-900 dark:text-gray-100 font-display">
            {/* Header */}
            <header className="flex-none bg-white dark:bg-[#1e282c] px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between z-20 relative shadow-sm">
                <button 
                    onClick={() => router.back()}
                    className="size-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300"
                >
                    <span className="material-symbols-outlined text-[24px]">arrow_back_ios_new</span>
                </button>
                <div className="flex flex-col items-center justify-center">
                    <div className="flex items-center gap-2">
                        <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                            {otherUser?.display_name || 'Loading...'}
                        </h1>
                        <span className="size-2 rounded-full bg-green-500 shadow-[0_0_0_2px_white] dark:shadow-[0_0_0_2px_#1e282c]"></span>
                    </div>
                    <span className="text-xs font-medium text-gray-400 dark:text-gray-500">Active now</span>
                </div>
                <button className="size-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 dark:text-gray-500">
                    <span className="material-symbols-outlined text-[24px]">more_vert</span>
                </button>
            </header>

            {/* Product Context Bar (Pinned) */}
            {productContext && (
                <div className="flex-none z-10 bg-[#f6f7f8] dark:bg-[#131b1f] px-4 py-3">
                    <Link 
                        href={`/marketplace/${productContext.id}`}
                        className="flex items-center gap-3 p-3 bg-white dark:bg-[#1e282c] rounded-xl shadow-soft border border-gray-100 dark:border-gray-800 relative overflow-hidden group cursor-pointer transition-transform active:scale-[0.99]"
                    >
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#2e8ab8]"></div>
                        <div 
                            className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 bg-cover bg-center shrink-0" 
                            style={{ backgroundImage: `url('${productContext.images?.[0] || productContext.image_url}')` }}
                        ></div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate pr-2">{productContext.title}</h3>
                            <p className="text-[#2e8ab8] font-bold text-sm">GHS {productContext.price} <span className="text-xs font-normal text-gray-400 dark:text-gray-500 ml-1">• {productContext.condition}</span></p>
                        </div>
                        <div className="shrink-0 pr-1">
                            <span className="material-symbols-outlined text-gray-300 dark:text-gray-600">chevron_right</span>
                        </div>
                    </Link>
                </div>
            )}

            {/* Chat Area */}
            <main className="flex-1 overflow-y-auto no-scrollbar px-4 pb-4 space-y-6 scroll-smooth">
                <div className="flex justify-center py-2">
                    <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full uppercase tracking-wider">Conversation Started</span>
                </div>

                {messages.map((msg, index) => {
                    const isMe = msg.sender_id === currentUser?.id;
                    return (
                        <div key={msg.id} className={`flex items-end gap-3 group ${isMe ? 'justify-end' : ''}`}>
                            {!isMe && (
                                <div 
                                    className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700 bg-cover bg-center shrink-0 mb-1"
                                    style={{ backgroundImage: `url('${otherUser?.avatar_url || ''}')` }}
                                >
                                    {!otherUser?.avatar_url && (
                                        <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-500">
                                            {otherUser?.display_name?.[0]?.toUpperCase()}
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className={`flex flex-col gap-1 max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                                <div className={`p-4 rounded-2xl shadow-sm text-[15px] leading-relaxed ${
                                    isMe 
                                    ? 'bg-[#2e8ab8] text-white rounded-br-none' 
                                    : 'bg-white dark:bg-[#1e282c] text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-800 rounded-bl-none'
                                }`}>
                                    {msg.content}
                                </div>
                                <div className="flex items-center gap-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[11px] text-gray-400 dark:text-gray-600">
                                        {formatTime(msg.created_at)}
                                    </span>
                                    {isMe && (
                                        <span className="material-symbols-outlined text-[12px] text-[#2e8ab8]">done_all</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </main>

            {/* Footer */}
            <footer className="flex-none bg-white dark:bg-[#1e282c] border-t border-gray-100 dark:border-gray-800 p-4 pb-4 z-20">
                <div className="flex justify-center -mt-8 mb-4">
                    <button className="flex items-center gap-2 bg-white dark:bg-[#1e282c] border border-[#2e8ab8]/30 text-[#2e8ab8] px-4 py-2 rounded-full shadow-lg text-sm font-semibold hover:bg-[#2e8ab8]/5 transition-all transform hover:-translate-y-0.5 active:scale-95">
                        <span className="material-symbols-outlined text-[18px]">sell</span>
                        Make an Offer
                    </button>
                </div>
                <form onSubmit={handleSendMessage} className="flex items-end gap-3">
                    <button type="button" className="p-3 text-gray-400 hover:text-[#2e8ab8] dark:text-gray-500 dark:hover:text-[#2e8ab8] transition-colors bg-gray-50 dark:bg-gray-800 rounded-full shrink-0">
                        <span className="material-symbols-outlined text-[24px]">add</span>
                    </button>
                    <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center p-1 border border-transparent focus-within:border-[#2e8ab8]/50 focus-within:bg-white dark:focus-within:bg-black transition-all">
                        <textarea 
                            className="w-full bg-transparent border-none text-gray-900 dark:text-white placeholder-gray-400 focus:ring-0 resize-none py-3 px-4 max-h-24" 
                            placeholder="Message..." 
                            rows="1"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage(e);
                                }
                            }}
                        ></textarea>
                        <button type="button" className="p-2 mr-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors">
                            <span className="material-symbols-outlined text-[20px]">sentiment_satisfied</span>
                        </button>
                    </div>
                    <button 
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="p-3 bg-[#2e8ab8] text-white rounded-full shadow-lg shadow-[#2e8ab8]/30 hover:bg-[#2e8ab8]/90 transition-colors transform active:scale-95 shrink-0 flex items-center justify-center disabled:opacity-50 disabled:shadow-none"
                    >
                        <span className="material-symbols-outlined text-[20px] ml-0.5">send</span>
                    </button>
                </form>
            </footer>
        </div>
    );
}
