'use client';

import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import React, { useState, useEffect, useRef, useCallback } from 'react';

const PullToRefresh = ({ onRefresh, children, disabled = false }) => {
    const [pullDelta, setPullDelta] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    
    const startY = useRef(0);
    const startX = useRef(0);
    const state = useRef({
        isEligible: false,
        isPulling: false,
    });
    
    const threshold = 70;
    const maxPull = 110;

    const getScrollTop = () => {
        if (typeof window === 'undefined') return 0;
        return window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    };

    const handleTouchStart = useCallback((e) => {
        if (disabled || isRefreshing) {
            state.current.isEligible = false;
            state.current.isPulling = false;
            return;
        }

        // Only eligible if at the absolute top of the page
        if (getScrollTop() > 0) {
            state.current.isEligible = false;
            state.current.isPulling = false;
            return;
        }

        startY.current = e.touches[0].clientY;
        startX.current = e.touches[0].clientX;
        state.current.isEligible = true;
        state.current.isPulling = false;
    }, [disabled, isRefreshing]);

    const handleTouchMove = useCallback((e) => {
        if (!state.current.isEligible || disabled || isRefreshing) return;

        const currentY = e.touches[0].clientY;
        const currentX = e.touches[0].clientX;
        const deltaY = currentY - startY.current;
        const deltaX = currentX - startX.current;

        // If the page has scrolled or finger is moving up, cancel immediately and allow normal scroll
        if (getScrollTop() > 0 || deltaY <= 0) {
            state.current.isEligible = false;
            if (state.current.isPulling) {
                state.current.isPulling = false;
                setIsDragging(false);
                setPullDelta(0);
            }
            return;
        }

        // If horizontal movement is greater than vertical movement, cancel immediately
        if (!state.current.isPulling && Math.abs(deltaX) >= deltaY) {
            state.current.isEligible = false;
            return;
        }

        // Only activate pull-to-refresh if deliberately pulled downward past 10px
        if (deltaY > 10) {
            state.current.isPulling = true;
            setIsDragging(true);

            // Progressive resistance
            const pullAmount = Math.min((deltaY - 10) * 0.4, maxPull);
            setPullDelta(pullAmount);

            // Prevent native bounce only when actively pulling down to refresh
            if (e.cancelable) {
                e.preventDefault();
            }
        }
    }, [disabled, isRefreshing]);

    const handleTouchEnd = useCallback(async () => {
        const wasPulling = state.current.isPulling;
        state.current.isEligible = false;
        state.current.isPulling = false;
        setIsDragging(false);

        if (wasPulling && pullDelta >= threshold) {
            setIsRefreshing(true);
            setPullDelta(60);

            try {
                if (onRefresh) {
                    await onRefresh();
                }
            } catch (err) {
                console.error('Refresh error:', err);
            } finally {
                setTimeout(() => {
                    setIsRefreshing(false);
                    setPullDelta(0);
                }, 350);
            }
        } else {
            setPullDelta(0);
        }
    }, [pullDelta, threshold, onRefresh]);

    useEffect(() => {
        if (disabled) return;

        window.addEventListener('touchstart', handleTouchStart, { passive: true });
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd, { passive: true });
        window.addEventListener('touchcancel', handleTouchEnd, { passive: true });

        return () => {
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
            window.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [disabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

    return (
        <div className="relative w-full h-full min-h-[50vh]">
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

            {/* Content Container */}
            <div className="h-full w-full">
                {children}
            </div>
        </div>
    );
};

export default PullToRefresh;
