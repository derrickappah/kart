'use client';

import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import React, { useState, useEffect, useRef, useCallback } from 'react';

const PullToRefresh = ({ onRefresh, children, disabled = false }) => {
    const [pullDelta, setPullDelta] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    
    const startY = useRef(0);
    const startX = useRef(0);
    const canPull = useRef(false);
    const isPulling = useRef(false);
    const containerRef = useRef(null);
    const threshold = 70;
    const maxPull = 110;

    const getScrollTop = () => {
        return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    };

    const handleTouchStart = useCallback((e) => {
        if (disabled || isRefreshing) return;
        
        startY.current = e.touches[0].pageY;
        startX.current = e.touches[0].pageX;
        isPulling.current = false;
        
        // Can ONLY initiate pull-to-refresh if the page is at the very top
        canPull.current = getScrollTop() <= 0;
    }, [disabled, isRefreshing]);

    const handleTouchMove = useCallback((e) => {
        if (disabled || isRefreshing || !canPull.current) return;
        
        const currentY = e.touches[0].pageY;
        const currentX = e.touches[0].pageX;
        const deltaY = currentY - startY.current;
        const deltaX = currentX - startX.current;

        // If the user swipes UP, they are scrolling down — disable pull immediately for this gesture
        if (deltaY <= 0) {
            canPull.current = false;
            if (isPulling.current) {
                isPulling.current = false;
                setIsDragging(false);
                setPullDelta(0);
            }
            return;
        }

        // If horizontal movement dominates, disable pull to allow horizontal swiping/carousels
        if (!isPulling.current && Math.abs(deltaX) > Math.abs(deltaY)) {
            canPull.current = false;
            return;
        }

        // Only start pulling down if we are at the top and pulling downward
        if (deltaY > 5 && getScrollTop() <= 0) {
            isPulling.current = true;
            setIsDragging(true);
            
            // Apply progressive resistance
            const resistedDelta = Math.min(deltaY * 0.4, maxPull);
            setPullDelta(resistedDelta);
            
            if (e.cancelable) {
                e.preventDefault();
            }
        }
    }, [disabled, isRefreshing]);

    const handleTouchEnd = useCallback(async () => {
        canPull.current = false;
        const wasPulling = isPulling.current;
        isPulling.current = false;
        setIsDragging(false);

        if (wasPulling && pullDelta >= threshold) {
            setIsRefreshing(true);
            setPullDelta(60); // Hold at indicator state
            
            try {
                if (onRefresh) {
                    await onRefresh();
                }
            } catch (err) {
                console.error('Refresh failed:', err);
            } finally {
                setTimeout(() => {
                    setIsRefreshing(false);
                    setPullDelta(0);
                }, 400);
            }
        } else {
            setPullDelta(0);
        }
    }, [pullDelta, threshold, onRefresh]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        el.addEventListener('touchstart', handleTouchStart, { passive: true });
        el.addEventListener('touchmove', handleTouchMove, { passive: false });
        el.addEventListener('touchend', handleTouchEnd, { passive: true });
        el.addEventListener('touchcancel', handleTouchEnd, { passive: true });

        return () => {
            el.removeEventListener('touchstart', handleTouchStart);
            el.removeEventListener('touchmove', handleTouchMove);
            el.removeEventListener('touchend', handleTouchEnd);
            el.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

    if (disabled) {
        return <>{children}</>;
    }

    return (
        <div ref={containerRef} className="relative w-full h-full min-h-[50vh]">
            {/* Pull Indicator (Floating Badge) */}
            <div 
                className={`pointer-events-none fixed left-0 right-0 top-3 z-50 flex justify-center ${
                    !isDragging ? 'transition-all duration-300 ease-out' : ''
                }`}
                style={{ 
                    transform: `translate3d(0, ${isRefreshing ? 60 : pullDelta}px, 0)`,
                    opacity: (pullDelta > 10 || isRefreshing) ? 1 : 0,
                    visibility: (pullDelta > 5 || isRefreshing) ? 'visible' : 'hidden'
                }}
            >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-[#2d2d32] shadow-md border border-gray-200/80 dark:border-gray-700/80 text-[#1daddd]">
                    {isRefreshing ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#1daddd] border-t-transparent" />
                    ) : (
                        <DynamicLucideIcon 
                            name="arrow_downward" 
                            size={20}
                            style={{ 
                                transform: `rotate(${Math.min((pullDelta / threshold) * 180, 180)}deg)`,
                                transition: isDragging ? 'none' : 'transform 0.15s ease'
                            }} 
                            className="text-[#1daddd]"
                        />
                    )}
                </div>
            </div>

            {/* Content Container remains stationary to prevent layout and sticky/fixed shifts */}
            <div className="h-full w-full">
                {children}
            </div>
        </div>
    );
};

export default PullToRefresh;
