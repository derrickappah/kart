'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export default function AppDeepLinkHandler() {
    const router = useRouter();

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        // Add listener for deep links
        const handleAppUrlOpen = async (event) => {
            const url = event.url;
            console.log('App URL opened:', url);

            // Handle kart-app://checkout-success?orderId=...
            if (url.startsWith('kart-app://checkout-success')) {
                const urlObj = new URL(url.replace('kart-app://', 'http://localhost/'));
                const orderId = urlObj.searchParams.get('orderId');
                const subscriptionId = urlObj.searchParams.get('subscriptionId');
                const adId = urlObj.searchParams.get('adId');
                
                // Get all original query parameters
                const queryParams = urlObj.search;
                
                if (orderId) {
                    router.push(`/dashboard/orders/${orderId}${queryParams}`);
                } else if (subscriptionId) {
                    router.push(`/subscriptions/success${queryParams}`);
                } else if (adId) {
                    router.push(`/dashboard/seller/listings/promote/success${queryParams}`);
                }
            }
        };

        const setupListener = async () => {
            await App.addListener('appUrlOpen', handleAppUrlOpen);
        };

        setupListener();

        // Check if the app was launched via a deep link
        const checkLaunchUrl = async () => {
            const launchData = await App.getLaunchUrl();
            if (launchData && launchData.url) {
                handleAppUrlOpen(launchData);
            }
        };

        checkLaunchUrl();

        return () => {
            // Capacitor listeners are usually not removed, but it's good practice
            App.removeAllListeners();
        };
    }, [router]);

    return null; // This component doesn't render anything
}
