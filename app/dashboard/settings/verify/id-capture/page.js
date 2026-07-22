'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function StudentIDCapturePage() {
    const router = useRouter();
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const containerRef = useRef(null);
    const viewfinderRef = useRef(null);

    const [isCapturing, setIsCapturing] = useState(false);
    const [showChecking, setShowChecking] = useState(false);
    const [cameraError, setCameraError] = useState(null);
    const [facingMode, setFacingMode] = useState('environment');
    const [capturedImage, setCapturedImage] = useState(null);

    // Check verification status and redirect if already verified or pending
    useEffect(() => {
        const checkStatus = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }

            const [profileRes, requestRes] = await Promise.all([
                supabase
                    .from('profiles')
                    .select('is_verified, verification_status')
                    .eq('id', user.id)
                    .maybeSingle(),
                supabase
                    .from('verification_requests')
                    .select('status')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
            ]);

            const profile = profileRes.data;
            const isVerified = profile?.is_verified || profile?.verification_status === 'Approved';
            const hasPending = requestRes.data && requestRes.data[0]?.status === 'Pending';

            if (isVerified || hasPending) {
                router.push('/dashboard/settings/verify');
            }
        };
        checkStatus();
    }, [router]);

    // Initialize Camera
    useEffect(() => {
        async function startCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { ideal: "environment" },
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    },
                    audio: false
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    streamRef.current = stream;
                    const track = stream.getVideoTracks()[0];
                    const actualFacingMode = track?.getSettings()?.facingMode;
                    if (actualFacingMode) {
                        setFacingMode(actualFacingMode);
                    }
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
                setCameraError("Unable to access camera. Please check permissions.");
            }
        }

        startCamera();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const handleCapture = () => {
        if (!videoRef.current || !canvasRef.current || isCapturing) return;

        setIsCapturing(true);

        // Instant flash effect
        const flashOverlay = document.getElementById('flash-overlay');
        if (flashOverlay) {
            flashOverlay.style.opacity = '1';
            setTimeout(() => {
                flashOverlay.style.opacity = '0';
            }, 100);
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const vWidth = video.videoWidth;
        const vHeight = video.videoHeight;

        if (vWidth && vHeight) {
            let sX = 0, sY = 0, sWidth = vWidth, sHeight = vHeight;

            if (viewfinderRef.current && containerRef.current) {
                const vRect = viewfinderRef.current.getBoundingClientRect();
                const cRect = containerRef.current.getBoundingClientRect();

                if (cRect.width > 0 && cRect.height > 0 && vRect.width > 0 && vRect.height > 0) {
                    const scale = Math.max(cRect.width / vWidth, cRect.height / vHeight);
                    const displayedVideoWidth = vWidth * scale;
                    const displayedVideoHeight = vHeight * scale;

                    const videoOffsetX = (displayedVideoWidth - cRect.width) / 2;
                    const videoOffsetY = (displayedVideoHeight - cRect.height) / 2;

                    const vRelX = vRect.left - cRect.left;
                    const vRelY = vRect.top - cRect.top;

                    const videoDisplayX = vRelX + videoOffsetX;
                    const videoDisplayY = vRelY + videoOffsetY;

                    sX = Math.max(0, videoDisplayX / scale);
                    sY = Math.max(0, videoDisplayY / scale);
                    sWidth = Math.min(vWidth - sX, vRect.width / scale);
                    sHeight = Math.min(vHeight - sY, vRect.height / scale);

                    if (facingMode === 'user') {
                        sX = vWidth - (sX + sWidth);
                    }
                }
            }

            const context = canvas.getContext('2d');
            canvas.width = sWidth;
            canvas.height = sHeight;

            if (facingMode === 'user') {
                context.translate(canvas.width, 0);
                context.scale(-1, 1);
            }

            context.drawImage(video, sX, sY, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
            const imageData = canvas.toDataURL('image/jpeg', 0.85);

            setCapturedImage(imageData);
            sessionStorage.setItem('capturedIDImage', imageData);
        }

        // Show "Checking clarity" after flash
        setTimeout(() => {
            setShowChecking(true);
            setTimeout(() => {
                router.push('/dashboard/settings/verify/review');
            }, 2000);
        }, 300);
    };

    return (
        <div className="bg-white dark:bg-[#242428] font-display antialiased min-h-screen flex flex-col items-center justify-center p-0 sm:p-4 transition-colors duration-200">
            {/* Mobile Frame Simulation */}
            <div className="relative w-full sm:max-w-[400px] h-screen sm:h-[850px] bg-black sm:rounded-[2.5rem] overflow-hidden shadow-2xl sm:border-8 sm:border-neutral-900 flex flex-col group/design-root">

                {/* Flash Overlay */}
                <div id="flash-overlay" className="absolute inset-0 bg-white z-[100] pointer-events-none opacity-0 transition-opacity duration-75"></div>

                {/* Real Camera Feed Layer */}
                <div ref={containerRef} className="absolute inset-0 z-0 bg-neutral-900 flex items-center justify-center">
                    {cameraError ? (
                        <div className="text-white text-center px-8">
                            <DynamicLucideIcon name="videocam_off" className="text-4xl mb-4 text-red-500" />
                            <p className="text-sm font-medium">{cameraError}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="mt-4 px-6 py-2 bg-primary rounded-full text-xs font-bold"
                            >
                                Retry Access
                            </button>
                        </div>
                    ) : (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                            style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
                        />
                    )}
                    <div className="absolute inset-0 bg-black/20"></div>
                </div>

                {/* Hidden Canvas for Capture */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Header Area */}
                <div className="relative z-20 w-full pt-12 pb-4 px-6 flex justify-center items-center bg-gradient-to-b from-black/80 to-transparent">
                    <h1 className="text-xl font-bold tracking-tight text-white text-center drop-shadow-md">
                        {showChecking ? "Processing capture..." : "Position your ID within the frame"}
                    </h1>
                </div>

                {/* Main Viewfinder Section (Centered) */}
                <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full">
                    {/* The Cutout/Viewfinder */}
                    <div
                        ref={viewfinderRef}
                        className="relative w-full max-w-[340px] aspect-[1.58/1] rounded-2xl mx-6 overflow-hidden group shadow-2xl"
                    >
                        {/* The "Hole" Effect Mask */}
                        <div
                            className="absolute -inset-[100vw] rounded-[inherit] pointer-events-none z-10"
                            style={{ boxShadow: '0 0 0 9999px rgba(17, 29, 33, 0.85)' }}
                        ></div>

                        {/* Viewfinder Overlay (Grid/Markers) */}
                        <div className="absolute inset-0 overflow-hidden rounded-2xl z-0 ring-1 ring-white/10">
                            {/* Grid Overlay */}
                            <div className="absolute inset-0 opacity-30 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:40px_40px]"></div>
                        </div>

                        {/* Active Scanning Animation */}
                        {!showChecking && !capturedImage && (
                            <div className="absolute inset-0 overflow-hidden rounded-2xl z-20">
                                <div
                                    className="w-full h-[50%] bg-gradient-to-b from-primary/0 via-primary/10 to-primary/0 animate-[scan_3s_cubic-bezier(0.4,0,0.2,1)_infinite] border-b border-primary/40"
                                    style={{ animationName: 'scan' }}
                                ></div>
                            </div>
                        )}

                        {/* Captured Image Display */}
                        {capturedImage && (
                            <img
                                src={capturedImage}
                                alt="Captured ID"
                                className="absolute inset-0 w-full h-full object-cover rounded-2xl z-25"
                            />
                        )}

                        {/* Corner Markers */}
                        <div className="absolute -top-1 -left-1 size-8 border-t-[4px] border-l-[4px] border-primary rounded-tl-2xl z-30 drop-shadow-[0_0_8px_rgba(29,173,221,0.5)]"></div>
                        <div className="absolute -top-1 -right-1 size-8 border-t-[4px] border-r-[4px] border-primary rounded-tr-2xl z-30 drop-shadow-[0_0_8px_rgba(29,173,221,0.5)]"></div>
                        <div className="absolute -bottom-1 -left-1 size-8 border-b-[4px] border-l-[4px] border-primary rounded-bl-2xl z-30 drop-shadow-[0_0_8px_rgba(29,173,221,0.5)]"></div>
                        <div className="absolute -bottom-1 -right-1 size-8 border-b-[4px] border-r-[4px] border-primary rounded-br-2xl z-30 drop-shadow-[0_0_8px_rgba(29,173,221,0.5)]"></div>

                        {/* Center Crosshair */}
                        {!capturedImage && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-4 opacity-50 z-20">
                                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white"></div>
                                <div className="absolute top-0 left-1/2 h-full w-[1px] bg-white"></div>
                            </div>
                        )}

                        {/* Checking clarity overlay */}
                        {showChecking && (
                            <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center animate-in fade-in duration-500">
                                <div className="size-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
                                <p className="text-white font-bold">Checking clarity...</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Controls */}
                <div className="relative z-20 pb-12 pt-6 px-8 bg-gradient-to-t from-black via-black/90 to-transparent w-full flex items-center justify-center">
                    {/* Primary Shutter Button */}
                    <button
                        onClick={handleCapture}
                        disabled={isCapturing || !!cameraError}
                        aria-label="Take Photo"
                        className="relative flex items-center justify-center size-[84px] rounded-full border-4 border-white transition-all active:scale-95 group shadow-2xl disabled:opacity-50"
                    >
                        <div className="absolute inset-0 rounded-full bg-white/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className={`size-[68px] rounded-full ${isCapturing ? 'bg-[#1daddd]' : 'bg-primary'} group-hover:bg-[#159ac6] transition-colors shadow-inner flex items-center justify-center relative overflow-hidden`}>
                            <DynamicLucideIcon name="camera" className="text-black/40 text-4xl opacity-0 group-active:opacity-100 transition-opacity duration-100" />
                        </div>
                    </button>
                </div>
            </div>

            <style jsx global>{`
                @keyframes scan {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(100%); }
                }
            `}</style>
        </div>
    );
}
