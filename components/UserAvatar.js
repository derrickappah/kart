'use client';

import { useState } from 'react';
import { getAvatarUrl } from '@/utils/avatar';

/**
 * Reusable UserAvatar component with automatic DiceBear Adventurer fallback.
 *
 * @param {object} props
 * @param {string} [props.src] - Custom image or avatar URL
 * @param {object} [props.user] - User or Profile object (has avatar_url, display_name, id, etc.)
 * @param {string} [props.alt] - Alt text
 * @param {string} [props.className] - Extra Tailwind classes (e.g. 'size-10', 'border-2 border-white')
 * @param {string} [props.fallbackSeed] - Optional seed for fallback
 * @param {boolean} [props.showOnline] - Whether to show green online indicator
 * @param {object} [props.style] - Inline style overrides
 */
export default function UserAvatar({
    src,
    user,
    alt = 'User avatar',
    className = 'size-10',
    fallbackSeed = '',
    showOnline = false,
    style = {},
    ...rest
}) {
    const primaryUrl = src || getAvatarUrl(user, fallbackSeed);
    const [imgSrc, setImgSrc] = useState(primaryUrl);
    const [hasError, setHasError] = useState(false);

    const handleError = () => {
        if (!hasError) {
            setHasError(true);
            // Fallback to a guaranteed DiceBear Adventurer avatar
            const seed = user?.id || user?.display_name || user?.username || fallbackSeed || 'fallback';
            setImgSrc(getAvatarUrl(null, seed));
        }
    };

    return (
        <div className={`relative inline-block shrink-0 ${className}`} style={style}>
            <div className="w-full h-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-sm">
                <img
                    src={hasError ? imgSrc : (src || getAvatarUrl(user, fallbackSeed))}
                    alt={alt}
                    onError={handleError}
                    className="w-full h-full object-cover rounded-full select-none"
                    loading="lazy"
                    {...rest}
                />
            </div>
            {showOnline && (
                <span className="absolute bottom-0 right-0 size-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full" />
            )}
        </div>
    );
}
