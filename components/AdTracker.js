'use client';
import { useEffect, useRef } from 'react';

/**
 * AdTracker — wraps an advertisement card and fires impression/click events
 * to the server-side tracking API.
 *
 * Uses a React ref (not getElementById) so the observer attaches reliably
 * even when the component mounts after the DOM is fully built, and avoids
 * ID collisions when the same ad appears more than once on a page.
 */
export default function AdTracker({ advertisementId, children }) {
    const containerRef = useRef(null);
    const trackedViewRef = useRef(false);

    useEffect(() => {
        if (!advertisementId) return;

        // Reset tracking flag whenever the ad ID changes
        trackedViewRef.current = false;

        const element = containerRef.current;
        if (!element) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !trackedViewRef.current) {
                    trackedViewRef.current = true;
                    const viewKey = `ad_view_${advertisementId}`;
                    if (typeof window !== 'undefined' && !window.sessionStorage.getItem(viewKey)) {
                        window.sessionStorage.setItem(viewKey, 'true');
                        fetch('/api/ads/track', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ advertisementId, eventType: 'view' })
                        }).catch(err => console.error('Error tracking ad view:', err));
                    }
                    observer.disconnect();
                }
            });
        }, { threshold: 0.1 }); // Fire when ≥10% of the element is visible

        observer.observe(element);

        return () => observer.disconnect();
    }, [advertisementId]);

    const handleClick = () => {
        if (!advertisementId) return;
        const clickKey = `ad_click_${advertisementId}`;
        if (typeof window !== 'undefined' && !window.sessionStorage.getItem(clickKey)) {
            window.sessionStorage.setItem(clickKey, 'true');
            fetch('/api/ads/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ advertisementId, eventType: 'click' })
            }).catch(err => console.error('Error tracking ad click:', err));
        }
    };

    return (
        <div ref={containerRef} onClick={handleClick} className="contents">
            {children}
        </div>
    );
}
