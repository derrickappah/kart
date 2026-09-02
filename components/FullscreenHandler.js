"use client";

import { useEffect } from 'react';

/**
 * FullscreenHandler automatically requests true fullscreen (hiding top status bar
 * and bottom system navigation bar) when running on mobile devices or PWAs upon user gesture.
 */
export default function FullscreenHandler() {
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const isMobileDevice = () => {
            return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
                (window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
        };

        const isStandalone = () => {
            return window.matchMedia('(display-mode: standalone)').matches ||
                window.matchMedia('(display-mode: fullscreen)').matches ||
                window.navigator.standalone === true;
        };

        const triggerFullscreen = async () => {
            try {
                const isFs = document.fullscreenElement ||
                    document.webkitFullscreenElement ||
                    document.mozFullScreenElement ||
                    document.msFullscreenElement;

                if (!isFs && (isMobileDevice() || isStandalone())) {
                    const docEl = document.documentElement;
                    if (docEl.requestFullscreen) {
                        await docEl.requestFullscreen();
                    } else if (docEl.webkitRequestFullscreen) {
                        await docEl.webkitRequestFullscreen();
                    } else if (docEl.mozRequestFullScreen) {
                        await docEl.mozRequestFullScreen();
                    } else if (docEl.msRequestFullscreen) {
                        await docEl.msRequestFullscreen();
                    }
                }
            } catch {
                // Ignore if rejected by browser gesture restriction
            }
        };

        const handleInteraction = (e) => {
            // Avoid triggering when tapping inputs/textareas so keyboard/focus isn't disrupted
            const tag = e.target?.tagName?.toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

            triggerFullscreen();
        };

        window.addEventListener('touchend', handleInteraction, { passive: true });
        window.addEventListener('click', handleInteraction, { passive: true });

        return () => {
            window.removeEventListener('touchend', handleInteraction);
            window.removeEventListener('click', handleInteraction);
        };
    }, []);

    return null;
}
