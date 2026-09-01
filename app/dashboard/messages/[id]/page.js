'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useEffect, useState, useRef, useCallback } from 'react';
import { mutate as globalMutate } from 'swr';
import { createClient } from '../../../../utils/supabase/client';
import { broadcastMessagesRead } from '@/app/hooks/useUnreadMessagesCount';
import { parseSafeDate } from '@/utils/dateUtils';
import { isAudioUrl, isVideoUrl, isImageUrl } from '@/utils/mediaUtils';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ReportModal from '../../../../components/ReportModal';
import { formatPrice } from '../../../../utils/formatters';

function AudioMessageBubble({ src, isMe }) {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration || 0);
        }
    };

    const handleSeek = (e) => {
        if (!audioRef.current || !duration) return;
        const newTime = (parseFloat(e.target.value) / 100) * duration;
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    };

    const formatSeconds = (secs) => {
        if (isNaN(secs) || secs <= 0) return '0:00';
        const mins = Math.floor(secs / 60);
        const rem = Math.floor(secs % 60);
        return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="flex items-center gap-3 py-1 px-1 min-w-[210px] max-w-full">
            <audio
                ref={audioRef}
                src={src}
                preload="metadata"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => {
                    setIsPlaying(false);
                    setCurrentTime(0);
                }}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
            />

            <button
                type="button"
                onClick={togglePlay}
                className={`size-9 rounded-full flex items-center justify-center shrink-0 shadow-sm transition-transform active:scale-90 ${
                    isMe
                        ? 'bg-white text-[#1daddd] hover:bg-white/90'
                        : 'bg-[#1daddd] text-white hover:bg-[#159ac6]'
                }`}
                aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
            >
                <DynamicLucideIcon name={isPlaying ? 'pause' : 'play_arrow'} className="text-[18px] ml-0.5" />
            </button>

            <div className="flex-1 flex flex-col justify-center min-w-0">
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={progress}
                    onChange={handleSeek}
                    className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[#1daddd] ${
                        isMe ? 'bg-white/40' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                />
                <div className={`flex justify-between items-center text-[10px] mt-1 font-medium select-none ${
                    isMe ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
                }`}>
                    <span>{formatSeconds(currentTime)}</span>
                    <span>{formatSeconds(duration || 0)}</span>
                </div>
            </div>
        </div>
    );
}

export default function ChatPage() {
    const { id: conversationId } = useParams();
    const searchParams = useSearchParams();
    const sellerId = searchParams.get('seller');
    const supabase = createClient();
    const router = useRouter();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const currentUserRef = useRef(null);
    const [otherUser, setOtherUser] = useState(null);
    const [productContext, setProductContext] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showOptions, setShowOptions] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const optionsRef = useRef(null);
    const [sending, setSending] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [uploading, setUploading] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);

    // Audio recording state
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recordingTimerRef = useRef(null);
    const streamRef = useRef(null);

    const markConversationAsRead = useCallback(async (convId, userId) => {
        if (!convId || convId === 'new') return;
        
        broadcastMessagesRead(convId);

        const targetUserId = userId || currentUserRef.current?.id;
        if (targetUserId) {
            try {
                supabase
                    .from('messages')
                    .update({ is_read: true })
                    .eq('conversation_id', convId)
                    .neq('sender_id', targetUserId)
                    .then();
            } catch (err) {
                console.warn('[ChatPage] Direct client update non-critical:', err);
            }
        }

        try {
            await fetch('/api/messages/mark-read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversationId: convId }),
            });
        } catch (e) {
            console.error('[ChatPage] mark-as-read API error:', e);
        }

        globalMutate('/api/messages/unread-count');
        globalMutate('conversations');
    }, [supabase]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Close options menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (optionsRef.current && !optionsRef.current.contains(event.target)) {
                setShowOptions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        let isMounted = true;
        let channel = null;

        const init = async () => {
            try {
                const { data: { user }, error: authError } = await supabase.auth.getUser();
                if (authError || !user) {
                    if (isMounted) router.push('/login');
                    return;
                }
                if (!isMounted) return;
                currentUserRef.current = user;
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
                    if (isMounted) {
                        setOtherUser(profile);
                        setLoading(false);
                    }
                    return;
                }

                // Fetch conversation details
                const { data: conversation } = await supabase
                    .from('conversations')
                    .select('*')
                    .eq('id', conversationId)
                    .maybeSingle();

                if (conversation && isMounted) {
                    const otherParticipantId = conversation.participants?.find(p => p !== user.id);

                    const [profileResult, productResult] = await Promise.all([
                        otherParticipantId ? supabase
                            .from('profiles')
                            .select('*')
                            .eq('id', otherParticipantId)
                            .maybeSingle() : Promise.resolve({ data: null }),
                        conversation.product_id ? supabase
                            .from('products')
                            .select('*')
                            .eq('id', conversation.product_id)
                            .maybeSingle() : Promise.resolve({ data: null })
                    ]);

                    if (profileResult?.data && isMounted) setOtherUser(profileResult.data);
                    if (productResult?.data && isMounted) setProductContext(productResult.data);
                }

                // Fetch initial messages
                const { data: initialMessages } = await supabase
                    .from('messages')
                    .select('*')
                    .eq('conversation_id', conversationId)
                    .order('created_at', { ascending: true });

                if (isMounted) {
                    if (initialMessages) setMessages(initialMessages);
                    setLoading(false);
                    markConversationAsRead(conversationId, user.id);
                }
            } catch (error) {
                console.error("DEBUG: ChatPage init error:", error);
                if (isMounted) setLoading(false);
            }
        };

        init();

        if (conversationId !== 'new') {
            channel = supabase
                .channel(`room:${conversationId}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversationId}`
                }, (payload) => {
                    setMessages(prev => {
                        const exists = prev.some(m => m.id === payload.new.id);
                        if (exists) return prev;
                        return [...prev, payload.new];
                    });

                    const currentUserId = currentUserRef.current?.id;
                    if (currentUserId && payload.new.sender_id !== currentUserId) {
                        markConversationAsRead(conversationId, currentUserId);
                    }
                })
                .subscribe();
        }

        // Window focus and visibility listener to clear badges on app switch/focus
        const handleFocusOrVisible = () => {
            if (document.visibilityState === 'visible' && conversationId && conversationId !== 'new') {
                const currentUserId = currentUserRef.current?.id;
                if (currentUserId) {
                    markConversationAsRead(conversationId, currentUserId);
                }
            }
        };

        window.addEventListener('focus', handleFocusOrVisible);
        document.addEventListener('visibilitychange', handleFocusOrVisible);

        return () => {
            isMounted = false;
            window.removeEventListener('focus', handleFocusOrVisible);
            document.removeEventListener('visibilitychange', handleFocusOrVisible);
            if (channel) supabase.removeChannel(channel);
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        };
    }, [conversationId, sellerId, router, supabase, markConversationAsRead]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const formatTime = (dateString) => {
        const date = parseSafeDate(dateString);
        return date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    };

    const addEmoji = (emoji) => {
        setNewMessage(prev => prev + emoji);
        textareaRef.current?.focus();
    };

    // Robust file upload helper using server API (service role) with client fallback
    const uploadMediaFile = async (fileOrBlob, fileName, mimeType) => {
        try {
            const formData = new FormData();
            formData.append('file', fileOrBlob, fileName);
            formData.append('bucket', 'chat-attachments');
            formData.append('filePath', `${conversationId}/${fileName}`);

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (res.ok) {
                const data = await res.json();
                if (data.publicUrl) return data.publicUrl;
            }
        } catch (apiErr) {
            console.warn('[ChatPage] /api/upload failed, falling back to direct storage:', apiErr);
        }

        // Direct client fallback
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('chat-attachments')
            .upload(`${conversationId}/${fileName}`, fileOrBlob, {
                contentType: mimeType,
                upsert: true
            });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('chat-attachments')
            .getPublicUrl(`${conversationId}/${fileName}`);

        return publicUrl;
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !currentUser) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const publicUrl = await uploadMediaFile(file, fileName, file.type);
            await sendMessage(publicUrl);
        } catch (error) {
            console.error("Error uploading file:", error);
            alert("Failed to upload file: " + (error.message || "Permission or network error"));
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Voice recording handlers
    const startRecording = async () => {
        try {
            if (typeof window !== 'undefined' && window.isSecureContext === false && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                alert("Microphone recording requires a secure HTTPS connection.");
                return;
            }

            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                alert("Audio recording is not supported in this browser.");
                return;
            }

            // Stop any existing stream tracks
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
                streamRef.current = null;
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Safe MediaRecorder instantiation with browser-compatible codecs
            let mediaRecorder;
            const mimeTypes = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/mp4',
                'audio/aac',
                'audio/ogg;codecs=opus',
                'audio/ogg'
            ];

            let selectedMime = '';
            if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
                for (const mime of mimeTypes) {
                    if (MediaRecorder.isTypeSupported(mime)) {
                        selectedMime = mime;
                        break;
                    }
                }
            }

            try {
                mediaRecorder = selectedMime 
                    ? new MediaRecorder(stream, { mimeType: selectedMime }) 
                    : new MediaRecorder(stream);
            } catch (instError) {
                console.warn('[ChatPage] MediaRecorder with options failed, falling back to default:', instError);
                mediaRecorder = new MediaRecorder(stream);
            }

            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onerror = (recErr) => {
                console.error('[ChatPage] MediaRecorder error:', recErr);
                cancelRecording();
            };

            mediaRecorder.start(100);
            setIsRecording(true);
            setRecordingDuration(0);

            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error("Error starting recording:", err);
            const errName = err?.name || '';
            const errMsg = String(err?.message || err || '');

            if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
                alert(
                    "Microphone access is not enabled.\n\n" +
                    "To fix this:\n" +
                    "1. Tap the lock/tune icon in your browser address bar and set Microphone to 'Allow'.\n" +
                    "2. If on iOS (iPhone), check iPhone Settings → Safari → Microphone (or Settings → Privacy & Security → Microphone).\n" +
                    "3. If on Android, check Android Settings → Apps → Chrome/Browser → Permissions → Microphone.\n" +
                    "4. Refresh the page after enabling."
                );
            } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
                alert("No microphone found on this device. Please connect a microphone or headset.");
            } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
                alert("Your microphone is currently in use by another app (e.g. phone call, video call, or camera). Please close other apps and try again.");
            } else {
                alert("Could not start audio recording: " + (errMsg || "Unknown error"));
            }
        }
    };

    const cancelRecording = () => {
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.onstop = null;
            mediaRecorderRef.current.stop();
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        audioChunksRef.current = [];
        setIsRecording(false);
        setRecordingDuration(0);
    };

    const stopAndSendRecording = async () => {
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

        const mediaRecorder = mediaRecorderRef.current;
        if (!mediaRecorder || mediaRecorder.state === 'inactive') {
            cancelRecording();
            return;
        }

        setUploading(true);
        setIsRecording(false);

        mediaRecorder.onstop = async () => {
            try {
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(t => t.stop());
                    streamRef.current = null;
                }

                const mimeType = mediaRecorder.mimeType || 'audio/webm';
                const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

                if (audioBlob.size < 100) {
                    setUploading(false);
                    return;
                }

                const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
                const fileName = `voice_${Math.random().toString(36).substring(2)}_${Date.now()}.${ext}`;

                const publicUrl = await uploadMediaFile(audioBlob, fileName, mimeType);
                await sendMessage(publicUrl);
            } catch (err) {
                console.error("Error saving voice message:", err);
                alert("Failed to send voice message: " + (err.message || "Please try again."));
            } finally {
                setUploading(false);
                setRecordingDuration(0);
                audioChunksRef.current = [];
            }
        };

        mediaRecorder.stop();
    };

    const formatRecordingTimer = (secs) => {
        const mins = Math.floor(secs / 60);
        const rem = secs % 60;
        return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
    };

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
                        content: content,
                        is_read: false
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

            // Dispatch push notification to recipient
            fetch('/api/messages/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversationId: activeConversationId,
                    messageContent: content
                })
            }).catch(err => {
                console.warn('[Chat] Push dispatch error:', err);
            });

            setNewMessage('');
        } catch (error) {
            console.error("Error sending message:", error);
            alert("Failed to send message: " + (error.message || "Please try again."));
        } finally {
            setSending(false);
        }
    };

    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        if (isRecording) {
            await stopAndSendRecording();
            return;
        }
        if (newMessage.trim()) {
            await sendMessage(newMessage);
        }
    };

    const isTyping = newMessage.trim().length > 0;

    if (loading) {
        return (
            <div className="flex flex-col h-[100dvh] max-w-md mx-auto bg-[#f6f7f8] dark:bg-[#111d21] animate-pulse">
                {/* Header skeleton */}
                <div className="flex-none bg-white dark:bg-[#232628] px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                    <div className="size-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                    <div className="flex flex-col gap-1 flex-1">
                        <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded-full" />
                        <div className="h-3 w-16 bg-gray-100 dark:bg-gray-800 rounded-full" />
                    </div>
                    <div className="size-8 rounded-full bg-gray-200 dark:bg-gray-700" />
                </div>
                {/* Messages skeleton */}
                <main className="flex-1 px-4 pt-4 pb-4 flex flex-col gap-3">
                    <div className="flex justify-start"><div className="h-10 w-48 bg-white dark:bg-[#232628] rounded-2xl" /></div>
                    <div className="flex justify-end"><div className="h-10 w-36 bg-[#1daddd]/30 dark:bg-[#1daddd]/20 rounded-2xl" /></div>
                    <div className="flex justify-start"><div className="h-16 w-56 bg-white dark:bg-[#232628] rounded-2xl" /></div>
                    <div className="flex justify-end"><div className="h-10 w-44 bg-[#1daddd]/30 dark:bg-[#1daddd]/20 rounded-2xl" /></div>
                    <div className="flex justify-start"><div className="h-10 w-32 bg-white dark:bg-[#232628] rounded-2xl" /></div>
                    <div className="flex justify-end"><div className="h-20 w-52 bg-[#1daddd]/30 dark:bg-[#1daddd]/20 rounded-2xl" /></div>
                </main>
                {/* Footer skeleton */}
                <div className="flex-none bg-white dark:bg-[#232628] border-t border-gray-100 dark:border-gray-800 p-4 flex items-center gap-3">
                    <div className="size-11 rounded-full bg-gray-100 dark:bg-gray-800" />
                    <div className="flex-1 h-11 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
                    <div className="size-11 rounded-full bg-[#1daddd]/30 dark:bg-[#1daddd]/20" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[100dvh] max-w-md mx-auto overflow-hidden bg-[#f6f7f8] dark:bg-[#111d21] text-[#111618] dark:text-gray-100 font-display">
            <header className="flex-none bg-white dark:bg-[#232628] px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between z-30 shadow-sm relative">
                <button
                    onClick={() => router.back()}
                    className="size-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300"
                >
                    <DynamicLucideIcon name="arrow_back_ios_new" className="text-[24px]" />
                </button>
                <div className="flex flex-col items-center justify-center">
                    <div className="flex items-center gap-2">
                        <Link href={otherUser ? `/profile/${otherUser.id}` : '#'} className="hover:opacity-80 transition-opacity">
                            <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                                {otherUser?.display_name || 'Loading...'}
                            </h1>
                        </Link>
                        <span className="size-2 rounded-full bg-green-500 shadow-[0_0_0_2px_white] dark:shadow-[0_0_0_2px_#1e282c]"></span>
                    </div>
                    <span className="text-xs font-medium text-gray-400 dark:text-gray-500">Active now</span>
                </div>

                <div className="relative" ref={optionsRef}>
                    <button
                        onClick={() => setShowOptions(!showOptions)}
                        className={`size-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${showOptions ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}
                    >
                        <DynamicLucideIcon name="more_vert" className="text-[24px]" />
                    </button>

                    {/* Dropdown Menu */}
                    {showOptions && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#232628] rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                            {otherUser && (
                                <Link
                                    href={`/profile/${otherUser.id}`}
                                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2f2f35] transition-colors"
                                    onClick={() => setShowOptions(false)}
                                >
                                    <DynamicLucideIcon name="person" className="text-[20px]" />
                                    View Profile
                                </Link>
                            )}
                            <button
                                onClick={() => {
                                    setShowReportModal(true);
                                    setShowOptions(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-left"
                            >
                                <DynamicLucideIcon name="flag" className="text-[20px]" />
                                Report User
                            </button>
                        </div>
                    )}
                </div>
            </header>
            {productContext && (
                <div className="flex-none z-10 bg-[#f6f7f8] dark:bg-[#111d21] px-4 py-3">
                    <Link
                        href={`/marketplace/${productContext.id}`}
                        className="flex items-center gap-3 p-3 bg-white dark:bg-[#232628] rounded-xl shadow-soft border border-gray-100 dark:border-gray-800 relative overflow-hidden group cursor-pointer transition-transform active:scale-[0.99]"
                    >
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#1daddd]"></div>
                        <div
                            className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 bg-cover bg-center shrink-0"
                            style={{ backgroundImage: `url('${productContext.images?.[0] || productContext.image_url}')` }}
                        ></div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate pr-2">{productContext.title}</h3>
                            <p className="text-[#1daddd] font-bold text-sm">₵{formatPrice(productContext.price)} <span className="text-xs font-normal text-gray-400 dark:text-gray-500 ml-1">• {productContext.condition}</span></p>
                        </div>
                        <div className="shrink-0 pr-1">
                            <DynamicLucideIcon name="chevron_right" className="text-gray-300 dark:text-gray-600" />
                        </div>
                    </Link>
                </div>
            )}

            {/* Chat Area */}
            <main className="flex-1 overflow-y-auto overscroll-contain no-scrollbar px-4 pb-4 scroll-smooth flex flex-col">
                {[...messages].sort((a, b) => (parseSafeDate(a.created_at)?.getTime() || 0) - (parseSafeDate(b.created_at)?.getTime() || 0)).map((msg, index, sortedMessages) => {
                    const isMe = msg.sender_id === currentUser?.id;
                    const prevMsg = index > 0 ? sortedMessages[index - 1] : null;
                    const nextMsg = index < sortedMessages.length - 1 ? sortedMessages[index + 1] : null;

                    const msgDate = parseSafeDate(msg.created_at);
                    const prevMsgDate = prevMsg ? parseSafeDate(prevMsg.created_at) : null;
                    const nextMsgDate = nextMsg ? parseSafeDate(nextMsg.created_at) : null;

                    // Time gap calculations (in minutes)
                    const timeGapPrev = (prevMsgDate && msgDate) ? (msgDate.getTime() - prevMsgDate.getTime()) / (1000 * 60) : Infinity;
                    const timeGapNext = (nextMsgDate && msgDate) ? (nextMsgDate.getTime() - msgDate.getTime()) / (1000 * 60) : Infinity;

                    // Grouping Logic
                    const isSameSenderPrev = prevMsg?.sender_id === msg.sender_id;
                    const isSameSenderNext = nextMsg?.sender_id === msg.sender_id;

                    const isContinuedFromPrev = isSameSenderPrev && timeGapPrev <= 2;
                    const isContinuedToNext = isSameSenderNext && timeGapNext <= 2;

                    // Border Radius Logic
                    const topRadiusClass = isMe
                        ? (isContinuedFromPrev ? 'rounded-tr-sm' : 'rounded-tr-2xl')
                        : (isContinuedFromPrev ? 'rounded-tl-sm' : 'rounded-tl-2xl');

                    const bottomRadiusClass = isMe
                        ? (isContinuedToNext ? 'rounded-br-sm' : 'rounded-br-none')
                        : (isContinuedToNext ? 'rounded-bl-sm' : 'rounded-bl-none');

                    const bubbleShapeClass = `rounded-2xl ${topRadiusClass} ${bottomRadiusClass}`;
                    const marginTopClass = isContinuedFromPrev ? 'mt-[2px]' : 'mt-3';

                    // Time Divider Logic
                    const prevDayStr = prevMsgDate ? prevMsgDate.toDateString() : null;
                    const currDayStr = msgDate ? msgDate.toDateString() : null;
                    const isNewDay = prevDayStr !== currDayStr;
                    const showTimeBreak = !prevMsg || isNewDay || timeGapPrev > 15;

                    const isAudio = isAudioUrl(msg.content);
                    const isVideo = !isAudio && isVideoUrl(msg.content);
                    const isImage = !isAudio && !isVideo && isImageUrl(msg.content);

                    return (
                        <div key={msg.id} className="flex flex-col w-full">
                            {showTimeBreak && (
                                <div className="flex justify-center my-6 sticky top-2 z-10">
                                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 bg-white/90 dark:bg-[#1e282c]/90 backdrop-blur-sm px-4 py-1.5 rounded-full uppercase tracking-[0.15em] shadow-sm border border-gray-100 dark:border-gray-800">
                                        {isNewDay && msgDate ? msgDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : formatTime(msg.created_at)}
                                    </span>
                                </div>
                            )}

                            <div className={`flex items-end gap-1.5 group ${isMe ? 'justify-end' : 'justify-start'} ${marginTopClass}`}>
                                {!isMe && (
                                    <div className="w-8 shrink-0 flex flex-col justify-end">
                                        {!isContinuedToNext ? (
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
                                        ) : <div className="w-8" />}
                                    </div>
                                )}

                                <div className={`flex flex-col group max-w-[85%] ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className={`p-2 px-3 shadow-sm text-[15px] leading-[1.45] transition-all ${bubbleShapeClass} ${isMe
                                        ? `bg-[#1daddd] text-white`
                                        : `bg-white dark:bg-[#232628] text-[#111618] dark:text-gray-200 border border-gray-100 dark:border-gray-800`
                                        }`}>
                                        <div className="flex flex-col gap-1">
                                            <div className="break-words">
                                                {isAudio ? (
                                                    <AudioMessageBubble src={msg.content} isMe={isMe} />
                                                ) : isVideo ? (
                                                    <div className="rounded-xl overflow-hidden my-1 bg-black/20 dark:bg-black/50 shadow-inner max-w-full">
                                                        <video
                                                            src={msg.content}
                                                            controls
                                                            playsInline
                                                            preload="metadata"
                                                            className="w-full max-h-[340px] rounded-xl object-contain bg-black"
                                                        />
                                                    </div>
                                                ) : isImage ? (
                                                    <img
                                                        src={msg.content}
                                                        alt="Photo attachment"
                                                        className="max-w-full max-h-[340px] rounded-xl cursor-pointer hover:opacity-95 transition-opacity object-cover my-1"
                                                        onClick={() => window.open(msg.content, '_blank')}
                                                    />
                                                ) : typeof msg.content === 'string' && msg.content.startsWith('http') ? (
                                                    <a
                                                        href={msg.content}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-2 underline break-all py-1"
                                                    >
                                                        <DynamicLucideIcon name="attachment" className="text-[18px]" />
                                                        Attachment
                                                    </a>
                                                ) : (
                                                    typeof msg.content === 'string' && /^[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\u{200D}]+$/u.test(msg.content.trim()) && [...msg.content.trim()].length <= 6 ? (
                                                        <span className={`block leading-normal ${[...new Intl.Segmenter().segment(msg.content.trim())].length === 1 ? 'text-[40px]' : 'text-[28px]'
                                                            }`}>
                                                            {msg.content}
                                                        </span>
                                                    ) : (
                                                        msg.content
                                                    )
                                                )}
                                            </div>

                                            {/* Integrated Bottom-Right Timestamp with Wrapping Flow */}
                                            <div className={`flex items-center justify-end gap-1 mt-0.5 select-none self-end ${isMe ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'}`}>
                                                <span className="text-[9px] font-medium leading-none">
                                                    {formatTime(msg.created_at)}
                                                </span>
                                                {isMe && (
                                                    <DynamicLucideIcon name="done_all" className="text-[11px] leading-none" />
                                                )}
                                            </div>
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
            <footer className="flex-none bg-white dark:bg-[#232628] border-t border-gray-100 dark:border-gray-800 p-4 pb-4 z-30 relative">
                {/* Emoji Picker Popover */}
                {showEmojiPicker && !isRecording && (
                    <div className="absolute bottom-full left-4 mb-2 p-3 bg-white dark:bg-[#232628] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl z-20 grid grid-cols-6 gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
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
                    accept="image/*,video/*,audio/*"
                    onChange={handleFileUpload}
                />

                <form onSubmit={handleSendMessage} className="flex items-end gap-2.5">
                    {!isRecording && (
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="size-11 flex items-center justify-center text-gray-500 hover:text-[#1daddd] dark:text-gray-400 dark:hover:text-[#1daddd] transition-colors bg-gray-100 dark:bg-gray-800 rounded-full shrink-0 disabled:opacity-50"
                            aria-label="Attach file"
                        >
                            {uploading ? (
                                <div className="size-5 border-2 border-[#1daddd]/30 border-t-[#1daddd] rounded-full animate-spin"></div>
                            ) : (
                                <DynamicLucideIcon name="add" className="text-[22px]" />
                            )}
                        </button>
                    )}

                    {isRecording ? (
                        <div className="flex-1 bg-red-50/90 dark:bg-red-950/40 rounded-2xl flex items-center justify-between px-4 py-2.5 border border-red-200/80 dark:border-red-900/50 shadow-sm animate-pulse h-11">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <span className="size-2.5 rounded-full bg-red-500 animate-ping shrink-0" />
                                <span className="text-sm font-semibold text-red-600 dark:text-red-400 truncate">
                                    Recording {formatRecordingTimer(recordingDuration)}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={cancelRecording}
                                className="text-xs font-bold text-red-500 hover:text-red-700 dark:text-red-400 flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-red-100/70 dark:hover:bg-red-900/50 transition-colors shrink-0"
                            >
                                <DynamicLucideIcon name="delete" className="text-[15px]" />
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <div className="flex-1 min-h-[44px] bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center px-3 py-1 border border-transparent focus-within:border-[#1daddd]/50 focus-within:bg-white dark:focus-within:bg-[#111d21] transition-all">
                            <textarea
                                ref={textareaRef}
                                className="w-full bg-transparent border-none text-gray-900 dark:text-white placeholder-gray-400 focus:ring-0 resize-none py-2 px-1 max-h-24 text-sm leading-relaxed"
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
                                className={`p-1.5 transition-colors shrink-0 ${showEmojiPicker ? 'text-[#1daddd]' : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'}`}
                                aria-label="Insert emoji"
                            >
                                <DynamicLucideIcon name="sentiment_satisfied" className="text-[20px]" />
                            </button>
                        </div>
                    )}

                    {isRecording ? (
                        <button
                            type="button"
                            onClick={stopAndSendRecording}
                            disabled={uploading}
                            className="size-11 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md shadow-red-500/20 transition-all transform active:scale-95 shrink-0 flex items-center justify-center"
                            aria-label="Send audio message"
                        >
                            {uploading ? (
                                <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <DynamicLucideIcon name="send" className="text-[18px] translate-x-[1px]" />
                            )}
                        </button>
                    ) : isTyping ? (
                        <button
                            type="submit"
                            disabled={sending || uploading}
                            className="size-11 bg-[#1daddd] hover:bg-[#159ac6] text-white rounded-full shadow-md shadow-[#1daddd]/25 transition-all transform active:scale-95 shrink-0 flex items-center justify-center disabled:opacity-50 disabled:shadow-none"
                            aria-label="Send message"
                        >
                            {sending || uploading ? (
                                <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <DynamicLucideIcon name="send" className="text-[18px] translate-x-[1px]" />
                            )}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={startRecording}
                            disabled={uploading || sending}
                            className="size-11 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-[#1daddd] hover:text-white dark:hover:bg-[#1daddd] dark:hover:text-white rounded-full transition-all transform active:scale-95 shrink-0 flex items-center justify-center shadow-none hover:shadow-md"
                            aria-label="Record voice note"
                        >
                            {uploading ? (
                                <div className="size-5 border-2 border-[#1daddd]/30 border-t-[#1daddd] rounded-full animate-spin"></div>
                            ) : (
                                <DynamicLucideIcon name="mic" className="text-[20px]" />
                            )}
                        </button>
                    )}
                </form>
            </footer>

            <ReportModal 
                isOpen={showReportModal}
                onClose={() => setShowReportModal(false)}
                reportedUserId={otherUser?.id}
                targetName={otherUser?.display_name}
            />
        </div>
    );
}
