'use client';
import { useEffect, useState, useRef } from 'react';
import { createClient } from '../../../../utils/supabase/client';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function ChatPage() {
    const { id: conversationId } = useParams();
    const searchParams = useSearchParams();
    const sellerId = searchParams.get('seller');
    const supabase = createClient();
    const router = useRouter();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [otherUser, setOtherUser] = useState(null);
    const [productContext, setProductContext] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [uploading, setUploading] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        const init = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push('/login');
                    return;
                }
                setCurrentUser(user);

                if (conversationId === 'new') {
                    if (!sellerId) {
                        router.push('/dashboard/messages');
                        return;
                    }

                    // Check if conversation already exists
                    const { data: existingConvs } = await supabase
                        .from('conversations')
                        .select('*')
                        .contains('participants', [user.id, sellerId]);

                    const existing = existingConvs?.find(c => c.participants.includes(sellerId));
                    if (existing) {
                        router.replace(`/dashboard/messages/${existing.id}`);
                        return;
                    }

                    // Fetch seller profile for the "new" state
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', sellerId)
                        .maybeSingle();
                    setOtherUser(profile);
                    setLoading(false);
                    return;
                }

                // Fetch conversation details to get other participant and potential product context
                const { data: conversation } = await supabase
                    .from('conversations')
                    .select('*')
                    .eq('id', conversationId)
                    .contains('participants', [user.id])
                    .maybeSingle();

                if (conversation) {
                    const otherParticipantId = conversation.participants.find(p => p !== user.id);

                    // Fetch profile and product in parallel
                    const [profileResult, productResult] = await Promise.all([
                        supabase
                            .from('profiles')
                            .select('*')
                            .eq('id', otherParticipantId)
                            .maybeSingle(),
                        conversation.product_id ? supabase
                            .from('products')
                            .select('*')
                            .eq('id', conversation.product_id)
                            .maybeSingle() : Promise.resolve({ data: null })
                    ]);

                    if (profileResult.data) setOtherUser(profileResult.data);
                    if (productResult.data) setProductContext(productResult.data);
                }

                // Fetch initial messages
                const { data: initialMessages } = await supabase
                    .from('messages')
                    .select('*')
                    .eq('conversation_id', conversationId)
                    .order('created_at', { ascending: true });

                if (initialMessages) setMessages(initialMessages);

                setLoading(false);
            } catch (error) {
                console.error("DEBUG: ChatPage init error:", error);
                setLoading(false);
            }
        };

        init();

        if (conversationId === 'new') return;

        // Proper Real-time Subscription Setup
        const channel = supabase
            .channel(`room:${conversationId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${conversationId}`
            }, (payload) => {
                setMessages(prev => {
                    // Prevent duplicate messages if they were added locally first
                    const exists = prev.some(m => m.id === payload.new.id);
                    if (exists) return prev;
                    return [...prev, payload.new];
                });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [conversationId, router, supabase, sellerId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const addEmoji = (emoji) => {
        setNewMessage(prev => prev + emoji);
        textareaRef.current?.focus();
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !currentUser) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = `${conversationId}/${fileName}`;

            const { data, error: uploadError } = await supabase.storage
                .from('chat-attachments')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('chat-attachments')
                .getPublicUrl(filePath);

            // Automatically send the public URL as a message
            await sendMessage(publicUrl);
        } catch (error) {
            console.error("Error uploading file:", error);
            alert("Failed to upload file. Please try again.");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Shared send message logic to be used by both text and file uploads
    const sendMessage = async (content) => {
        if (!content.trim() || !currentUser || sending) return;

        setSending(true);
        try {
            let activeConversationId = conversationId;

            if (conversationId === 'new') {
                const { data: newConv, error: convError } = await supabase
                    .from('conversations')
                    .insert([{
                        participants: [currentUser.id, sellerId]
                    }])
                    .select()
                    .single();

                if (convError) throw convError;
                activeConversationId = newConv.id;
                router.replace(`/dashboard/messages/${newConv.id}`);
            }

            const { data: sentMsg, error } = await supabase
                .from('messages')
                .insert([
                    {
                        conversation_id: activeConversationId,
                        sender_id: currentUser.id,
                        content: content
                    }
                ])
                .select()
                .single();

            if (error) throw error;

            if (sentMsg) {
                setMessages(prev => {
                    const exists = prev.some(m => m.id === sentMsg.id);
                    if (exists) return prev;
                    return [...prev, sentMsg];
                });
            }

            await supabase
                .from('conversations')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', activeConversationId);

            setNewMessage('');
        } catch (error) {
            console.error("Error sending message:", error);
            alert("Failed to send message. Please try again.");
        } finally {
            setSending(false);
        }
    };

    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        await sendMessage(newMessage);
    };

    if (loading) {
        return (
            <div className="flex flex-col h-full bg-white dark:bg-[#242428] items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2e8ab8]"></div>
                <p className="mt-4 text-sm font-medium text-gray-500">Loading conversation...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-[#242428] text-gray-900 dark:text-gray-100 font-display">
            <header className="flex-none bg-white dark:bg-[#242428] px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between z-10 shadow-sm">
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
            <main className="flex-1 overflow-y-auto no-scrollbar px-4 pb-4 scroll-smooth flex flex-col">
                {[...messages].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map((msg, index, sortedMessages) => {
                    const isMe = msg.sender_id === currentUser?.id;
                    const prevMsg = index > 0 ? sortedMessages[index - 1] : null;

                    // Check if this message is from the same sender as the previous one
                    const isSameSender = prevMsg?.sender_id === msg.sender_id;

                    // Calculate time gap in minutes using getTime() for robustness
                    const timeGap = prevMsg
                        ? (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime()) / (1000 * 60)
                        : Infinity;

                    // WhatsApp-style grouping rules:
                    // Only group if same sender AND tight timeframe (2 mins)
                    const isGrouped = isSameSender && timeGap <= 2;

                    // Show a centered timestamp break if time gap is significant (> 15 mins for cleaner flow)
                    // or if it's the first message of the day
                    const prevDate = prevMsg ? new Date(prevMsg.created_at).toDateString() : null;
                    const currDate = new Date(msg.created_at).toDateString();
                    const isNewDay = prevDate !== currDate;
                    const showTimeBreak = !prevMsg || isNewDay || timeGap > 15;

                    return (
                        <div key={msg.id} className="flex flex-col w-full">
                            {showTimeBreak && (
                                <div className="flex justify-center my-6 sticky top-2 z-10">
                                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 bg-white/90 dark:bg-[#1e282c]/90 backdrop-blur-sm px-4 py-1.5 rounded-full uppercase tracking-[0.15em] shadow-sm border border-gray-100 dark:border-gray-800">
                                        {isNewDay ? new Date(msg.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : formatTime(msg.created_at)}
                                    </span>
                                </div>
                            )}

                            <div className={`flex items-end gap-1.5 group ${isMe ? 'justify-end' : 'justify-start'} ${isGrouped ? 'mt-0.5' : 'mt-3'}`}>
                                {!isMe && (
                                    <div className="w-8 shrink-0">
                                        {!isGrouped && (
                                            <div
                                                className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700 bg-cover bg-center shadow-sm"
                                                style={{ backgroundImage: `url('${otherUser?.avatar_url || ''}')` }}
                                            >
                                                {!otherUser?.avatar_url && (
                                                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-500">
                                                        {otherUser?.display_name?.[0]?.toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className={`relative flex flex-col group max-w-[85%] ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className={`relative p-2.5 px-3 rounded-2xl shadow-sm text-[15px] leading-[1.45] transition-all ${isMe
                                        ? `bg-[#2e8ab8] text-white ${isGrouped ? 'rounded-tr-md' : 'rounded-br-none'}`
                                        : `bg-white dark:bg-[#1e282c] text-gray-800 dark:text-gray-200 border border-gray-100/50 dark:border-gray-800/50 ${isGrouped ? 'rounded-tl-md' : 'rounded-bl-none'}`
                                        }`}>
                                        <div className="pr-12 min-w-[2rem] break-words">
                                            {msg.content.match(/\.(jpg|jpeg|png|gif|webp)/i) && msg.content.startsWith('http') ? (
                                                <div className="flex flex-col gap-2">
                                                    <img
                                                        src={msg.content}
                                                        alt="Attachment"
                                                        className="max-w-full rounded-lg cursor-pointer hover:opacity-95 transition-opacity"
                                                        onClick={() => window.open(msg.content, '_blank')}
                                                    />
                                                    {/* If there's text along with the image (though currently we send them separately), we could render it here */}
                                                </div>
                                            ) : msg.content.startsWith('http') ? (
                                                <a
                                                    href={msg.content}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 underline break-all"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">attachment</span>
                                                    Attachment
                                                </a>
                                            ) : (
                                                msg.content
                                            )}
                                        </div>

                                        {/* Integrated Bottom-Right Timestamp */}
                                        <div className={`absolute bottom-1.5 right-2.5 flex items-center gap-0.5 select-none ${isMe ? 'text-white/60' : 'text-gray-400 dark:text-gray-500'}`}>
                                            <span className="text-[9px] font-medium leading-none">
                                                {formatTime(msg.created_at)}
                                            </span>
                                            {isMe && (
                                                <span className="material-symbols-outlined text-[11px] leading-none">done_all</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </main>

            {/* Footer */}
            <footer className="flex-none bg-white dark:bg-[#242428] border-t border-gray-100 dark:border-gray-800 p-4 pb-4 z-10 relative">
                {/* Emoji Picker Popover */}
                {showEmojiPicker && (
                    <div className="absolute bottom-full left-4 mb-2 p-3 bg-white dark:bg-[#1e282c] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl z-20 grid grid-cols-6 gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                        {['😀', '😂', '😍', '👍', '🙏', '🔥', '✨', '💯', '🙌', '🎉', '👋', '❤️'].map(emoji => (
                            <button
                                key={emoji}
                                onClick={() => addEmoji(emoji)}
                                className="text-xl p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors active:scale-90"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}

                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileUpload}
                />

                <form onSubmit={handleSendMessage} className="flex items-end gap-3">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="p-3 text-gray-400 hover:text-[#2e8ab8] dark:text-gray-500 dark:hover:text-[#2e8ab8] transition-colors bg-gray-50 dark:bg-gray-800 rounded-full shrink-0 disabled:opacity-50"
                    >
                        {uploading ? (
                            <div className="size-6 border-2 border-[#2e8ab8]/30 border-t-[#2e8ab8] rounded-full animate-spin"></div>
                        ) : (
                            <span className="material-symbols-outlined text-[24px]">add</span>
                        )}
                    </button>
                    <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center p-1 border border-transparent focus-within:border-[#2e8ab8]/50 focus-within:bg-white dark:focus-within:bg-black transition-all">
                        <textarea
                            ref={textareaRef}
                            className="w-full bg-transparent border-none text-gray-900 dark:text-white placeholder-gray-400 focus:ring-0 resize-none py-3 px-4 max-h-24"
                            placeholder="Message..."
                            rows="1"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onFocus={() => setShowEmojiPicker(false)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage(e);
                                }
                            }}
                        ></textarea>
                        <button
                            type="button"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className={`p-2 mr-1 transition-colors ${showEmojiPicker ? 'text-[#2e8ab8]' : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'}`}
                        >
                            <span className="material-symbols-outlined text-[20px]">sentiment_satisfied</span>
                        </button>
                    </div>
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || sending || uploading}
                        className="p-3 bg-[#2e8ab8] text-white rounded-full shadow-lg shadow-[#2e8ab8]/30 hover:bg-[#2e8ab8]/90 transition-colors transform active:scale-95 shrink-0 flex items-center justify-center disabled:opacity-50 disabled:shadow-none min-w-[48px]"
                    >
                        {sending ? (
                            <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <span className="material-symbols-outlined text-[20px] ml-0.5">send</span>
                        )}
                    </button>
                </form>
            </footer>
        </div>
    );
}
