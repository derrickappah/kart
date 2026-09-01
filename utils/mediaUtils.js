/**
 * Shared media detection and formatting helpers for messages and attachments
 */

export function isAudioUrl(url) {
    if (typeof url !== 'string' || !url.startsWith('http')) return false;
    const clean = url.split('?')[0].toLowerCase();
    
    // Explicit voice note / audio prefixes
    if (clean.includes('/voice_') || clean.includes('/audio_') || clean.includes('voice-') || clean.includes('audio-')) {
        return true;
    }
    
    // Dedicated audio extensions
    return /\.(mp3|wav|m4a|aac|opus|weba|oga|caf|flac)$/i.test(clean);
}

export function isVideoUrl(url) {
    if (typeof url !== 'string' || !url.startsWith('http')) return false;
    if (isAudioUrl(url)) return false; // Audio always takes precedence for voice files
    
    const clean = url.split('?')[0].toLowerCase();
    return /\.(mp4|webm|mov|m4v|3gp|mkv|avi|ogv)$/i.test(clean);
}

export function isImageUrl(url) {
    if (typeof url !== 'string' || !url.startsWith('http')) return false;
    const clean = url.split('?')[0].toLowerCase();
    return /\.(jpg|jpeg|png|gif|webp|svg|bmp|heic|heif|avif)$/i.test(clean);
}

export function getMessageSnippet(content) {
    if (!content) return 'No messages yet';
    if (typeof content !== 'string') return String(content);
    
    if (content.startsWith('http')) {
        if (isAudioUrl(content)) return '🎤 Voice message';
        if (isVideoUrl(content)) return '🎥 Video';
        if (isImageUrl(content)) return '📷 Photo';
        if (content.includes('chat-attachments') || content.includes('storage')) return '📎 Attachment';
    }
    
    return content;
}
