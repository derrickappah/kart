'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AppDeepLinkHandler() {
    const router = useRouter();

    useEffect(() => {
        const setupDeepLinks = async () => {
            // Guard: Only run on native platforms
            const { Capacitor } = await import('@capacitor/core');
            if (!Capacitor.isNativePlatform()) return;

            // Dynamically import Capacitor plugins
            const { App } = await import('@capacitor/app');
            const { Browser } = await import('@capacitor/browser');

            // Add listener for deep links
            const handleAppUrlOpen = async (event) => {
                const url = event.url;
                console.log('App URL opened:', url);

                // Close the in-app browser if it's open
                try {
                    await Browser.close();
                } catch (e) {
                    // Ignore if already closed or not open
                }

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
                // Handle kart-app://auth-tokens?refresh_token=...
                else if (url.includes('auth-tokens')) {
                    console.log('Detected auth-tokens scheme. Parsing...');
                    
                    // Failsafe parsing for refresh_token only
                    let refreshToken = '';
                    try {
                        const urlObj = new URL(url.replace(/^[a-zA-Z.-0-9]+:\/\/?/, 'http://localhost/'));
                        refreshToken = urlObj.searchParams.get('refresh_token');
                    } catch (e) {
                        const match = url.match(/[?&]refresh_token=([^&#]+)/);
                        if (match) refreshToken = match[1];
                    }
                    
                    if (refreshToken) {
                        console.log('Detected refresh token, navigating to adoption page...');
                        router.push(`/auth/success?refresh_token=${refreshToken}`);
                    } else {
                        console.warn('No refresh token found in the URL:', url);
                    }
                }
            };

            await App.addListener('appUrlOpen', handleAppUrlOpen);

            // Check if the app was launched via a deep link
            const launchData = await App.getLaunchUrl();
            if (launchData && launchData.url) {
                handleAppUrlOpen(launchData);
            }

            return () => {
                App.removeAllListeners();
            };
        };

        setupDeepLinks();
    }, [router]);

    return null; // This component doesn't render anything
}
