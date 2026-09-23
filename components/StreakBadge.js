'use client';

import { useState, useEffect } from 'react';
import Lottie from 'lottie-react';
import streakAnimation from '@/public/streak.json';

export default function StreakBadge({ className = "size-6" }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className={className} aria-hidden="true" />;
    }

    return (
        <div className={`pointer-events-none flex items-center justify-center ${className}`} aria-hidden="true">
            <Lottie
                animationData={streakAnimation}
                loop={true}
                className="w-full h-full"
            />
        </div>
    );
}
