'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

const PullToRefresh = ({ onRefresh, children, disabled = false }) => {
    const [pullDelta, setPullDelta] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    
    const startY = useRef(0);
    const containerRef = useRef(null);
    const threshold = 80;
    const maxPull = 120;

    const handleTouchStart = (e) => {
        if (disabled || isRefreshing || window.scrollY > 0) return;
        startY.current = e.touches[0].pageY;
        setIsDragging(true);
    };

    const handleTouchMove = useCallback((e) => {
        if (!isDragging || disabled || isRefreshing || window.scrollY > 0) return;
        
        const currentY = e.touches[0].pageY;
        const delta = currentY - startY.current;
        
        if (delta > 0) {
            // Apply resistance
            const resistedDelta = Math.min(delta * 0.4, maxPull);
            setPullDelta(resistedDelta);
            
            // Prevent default scrolling when pulling
            if (delta > 10) {
                if (e.cancelable) e.preventDefault();
            }
        } else {
            setPullDelta(0);
        }
    }, [isDragging, disabled, isRefreshing]);

    const handleTouchEnd = async () => {
        if (!isDragging) return;
        setIsDragging(false);

        if (pullDelta >= threshold) {
            setIsRefreshing(true);
            setPullDelta(60); // Hold at a visible loading state
            
            try {
                await onRefresh();
            } finally {
                // Smooth transition back
                setTimeout(() => {
                    setIsRefreshing(false);
                    setPullDelta(0);
                }, 500);
            }
        } else {
            setPullDelta(0);
        }
    };

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const options = { passive: false };
        el.addEventListener('touchstart', handleTouchStart);
        el.addEventListener('touchmove', handleTouchMove, options);
        el.addEventListener('touchend', handleTouchEnd);

        return () => {
            el.removeEventListener('touchstart', handleTouchStart);
            el.removeEventListener('touchmove', handleTouchMove);
            el.removeEventListener('touchend', handleTouchEnd);
        };
    }, [handleTouchMove, handleTouchEnd]);

    return (
        <div ref={containerRef} className="relative w-full h-full min-h-[50vh]">
            {/* Pull Indicator */}
            <div 
                className="absolute left-0 right-0 flex justify-center pointer-events-none transition-transform duration-200 ease-out"
                style={{ 
                    top: -50,
                    transform: `translateY(${pullDelta}px)`,
                    opacity: pullDelta > 10 ? 1 : 0
                }}
            >
                <div className="bg-white dark:bg-[#2d2d32] rounded-full p-2 shadow-lg border border-gray-100 dark:border-gray-700 flex items-center justify-center">
                    {isRefreshing ? (
                        <div className="w-6 h-6 border-2 border-[#1daddd] border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <span 
                            className="material-symbols-outlined text-[#1daddd] transition-transform duration-200"
                            style={{ 
                                transform: `rotate(${Math.min(pullDelta * 2, 180)}deg)`,
                                fontSize: '24px'
                            }}
                        >
                            arrow_downward
                        </span>
                    )}
                </div>
            </div>

            {/* Content Container */}
            <div 
                className="transition-transform duration-200 ease-out h-full"
                style={{ 
                    transform: `translateY(${isRefreshing ? 60 : pullDelta}px)` 
                }}
            >
                {children}
            </div>
        </div>
    );
};

export default PullToRefresh;
