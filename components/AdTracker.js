'use client';
import { useEffect, useRef } from 'react';

export default function AdTracker({ advertisementId, children }) {
    const trackedRef = useRef(false);

    useEffect(() => {
        if (!advertisementId) return;

        // Reset tracking ref if advertisementId changes
        trackedRef.current = false;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !trackedRef.current) {
                    trackedRef.current = true;
                    fetch('/api/ads/track', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ advertisementId, eventType: 'view' })
                    }).catch(err => console.error('Error tracking ad view:', err));
                    observer.disconnect();
                }
            });
        }, { threshold: 0.1 }); // Trigger when 10% of the element is visible

        const element = document.getElementById(`ad-${advertisementId}`);
        if (element) {
            observer.observe(element);
        }

        return () => observer.disconnect();
    }, [advertisementId]);

    const handleClick = () => {
        if (!advertisementId) return;
        fetch('/api/ads/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ advertisementId, eventType: 'click' })
        }).catch(err => console.error('Error tracking ad click:', err));
    };

    return (
        <div id={`ad-${advertisementId}`} onClick={handleClick} className="contents">
            {children}
        </div>
    );
}
