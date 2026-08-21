'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function FaceCapturePage() {
    const router = useRouter();
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const containerRef = useRef(null);
    const viewfinderRef = useRef(null);

    const [isCapturing, setIsCapturing] = useState(false);
    const [showChecking, setShowChecking] = useState(false);
    const [cameraError, setCameraError] = useState(null);
    const [facingMode, setFacingMode] = useState('user');
    const [capturedImage, setCapturedImage] = useState(null);
    const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);

    // Check verification status and ensure ID was captured first
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
                return;
            }

            // Check if ID image exists in session storage
            const hasIDImage = sessionStorage.getItem('capturedIDImage');
            if (!hasIDImage) {
                router.replace('/dashboard/settings/verify/id-capture');
            }
        };
        checkStatus();
    }, [router]);

    // Initialize or switch camera
    const startCamera = useCallback(async (mode) => {
        try {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }

            const constraints = {
                video: {
                    facingMode: { ideal: mode },
                    width: { ideal: 1280 },
                    height: { ideal: 1280 }
                },
                audio: false
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
                const track = stream.getVideoTracks()[0];
                const actualFacingMode = track?.getSettings()?.facingMode || mode;
                setFacingMode(actualFacingMode);
                setCameraError(null);
            }
        } catch (err) {
            console.error("Error accessing front camera:", err);
            setCameraError("Unable to access camera. Please check camera permissions.");
        } finally {
            setIsSwitchingCamera(false);
        }
    }, []);

    useEffect(() => {
        startCamera(facingMode);

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [startCamera, facingMode]);

    const handleFlipCamera = () => {
        if (isSwitchingCamera || isCapturing) return;
        setIsSwitchingCamera(true);
        const newMode = facingMode === 'user' ? 'environment' : 'user';
        setFacingMode(newMode);
    };

    const handleCapture = () => {
        if (!videoRef.current || !canvasRef.current || isCapturing) return;

        setIsCapturing(true);

        // Flash animation
        const flashOverlay = document.getElementById('face-flash-overlay');
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
            sessionStorage.setItem('capturedFaceImage', imageData);
        }

        // Show "Analyzing facial clarity" after flash
        setTimeout(() => {
            setShowChecking(true);
            setTimeout(() => {
                router.push('/dashboard/settings/verify/review');
            }, 1800);
        }, 300);
    };

    return (
        <div className="fixed inset-0 z-[999] bg-black font-display antialiased w-screen h-screen h-[100dvh] overflow-hidden select-none touch-none">
            {/* Flash Overlay */}
            <div id="face-flash-overlay" className="absolute inset-0 bg-white z-[100] pointer-events-none opacity-0 transition-opacity duration-75"></div>

            {/* Hidden Canvas for Capture */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Camera Feed Layer */}
            <div ref={containerRef} className="absolute inset-0 z-0 bg-neutral-900 overflow-hidden">
                {cameraError ? (
                    <div className="text-white text-center px-8 h-full flex flex-col items-center justify-center">
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
                        className="full-screen-camera"
                        style={{
                            transform: facingMode === 'user' ? 'scaleX(-1)' : 'none'
                        }}
                    />
                )}
            </div>

            {/* Overlay Viewport */}
            <div className="absolute inset-0 z-10 flex flex-col justify-between items-center pointer-events-none py-6 px-4 sm:py-8 sm:px-6">
                {/* Header */}
                <div className="pointer-events-auto w-full pt-4 sm:pt-6 flex flex-col items-center relative z-30">
                    <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 mb-2">
                        <span className="size-2 rounded-full bg-primary animate-pulse"></span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-white">Step 3 of 3: Live Face Match</span>
                    </div>
                    <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white drop-shadow-lg text-center px-4">
                        {showChecking ? "Analyzing facial capture..." : "Center your face in the oval"}
                    </h1>
                    <p className="text-xs text-white/70 font-medium text-center mt-1 drop-shadow-md">
                        Look straight at the camera with good lighting
                    </p>
                </div>

                {/* Oval Viewfinder */}
                <div className="pointer-events-auto flex-1 w-full flex items-center justify-center px-4 min-h-0 relative z-10">
                    <div
                        ref={viewfinderRef}
                        className="relative w-full max-w-[270px] sm:max-w-[300px] aspect-[1/1.3] rounded-[50%] shadow-2xl shrink-0"
                    >
                        {/* Cutout Mask */}
                        <div
                            className="absolute inset-0 rounded-[inherit] pointer-events-none z-10"
                            style={{ boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.68)' }}
                        ></div>

                        {/* Viewfinder Inner */}
                        <div className="absolute inset-0 overflow-hidden rounded-[50%] z-0 border-2 border-primary/40">
                            {/* Scanning Animation */}
                            {!showChecking && !capturedImage && (
                                <div className="absolute inset-0 overflow-hidden rounded-[50%] z-20">
                                    <div
                                        className="w-full h-[50%] bg-gradient-to-b from-primary/0 via-primary/25 to-primary/0 animate-[scan_3s_cubic-bezier(0.4,0,0.2,1)_infinite] border-b-2 border-primary"
                                        style={{ animationName: 'scan' }}
                                    ></div>
                                </div>
                            )}

                            {/* Captured Image Display */}
                            {capturedImage && (
                                <img
                                    src={capturedImage}
                                    alt="Captured Selfie"
                                    className="absolute inset-0 w-full h-full object-cover rounded-[50%] z-25"
                                />
                            )}

                            {/* Center Crosshair / Silhouette Guidance */}
                            {!capturedImage && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-35 z-20 pointer-events-none">
                                    <div className="size-20 rounded-full border border-dashed border-white/60 mb-6"></div>
                                    <div className="w-24 h-12 rounded-t-full border border-dashed border-white/60"></div>
                                </div>
                            )}

                            {/* Checking Clarity Overlay */}
                            {showChecking && (
                                <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center animate-in fade-in duration-500">
                                    <div className="size-14 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-3"></div>
                                    <p className="text-white text-sm font-bold">Checking clarity...</p>
                                </div>
                            )}
                        </div>

                        {/* Glowing Oval Guide Ring */}
                        <div className="absolute -inset-1 rounded-[50%] border-2 border-primary/60 pointer-events-none z-30 shadow-[0_0_20px_rgba(29,173,221,0.4)]"></div>
                    </div>
                </div>

                {/* Bottom Shutter & Controls */}
                <div className="pointer-events-auto w-full pb-6 sm:pb-8 flex justify-center items-center gap-6 relative z-30">
                    {/* Back to ID Capture button */}
                    <button
                        onClick={() => router.push('/dashboard/settings/verify/id-capture')}
                        disabled={isCapturing}
                        className="size-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white flex items-center justify-center transition-all active:scale-90 border border-white/20"
                        title="Retake ID Card"
                    >
                        <DynamicLucideIcon name="arrow_back" className="size-5" />
                    </button>

                    {/* Main Capture Button */}
                    <button
                        onClick={handleCapture}
                        disabled={isCapturing || !!cameraError}
                        aria-label="Capture Selfie"
                        className="relative flex items-center justify-center size-[84px] rounded-full border-4 border-white transition-all active:scale-95 group shadow-2xl disabled:opacity-50"
                    >
                        <div className="absolute inset-0 rounded-full bg-white/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className={`size-[68px] rounded-full ${isCapturing ? 'bg-[#1daddd]' : 'bg-primary'} group-hover:bg-[#159ac6] transition-colors shadow-inner flex items-center justify-center relative overflow-hidden`}>
                            <DynamicLucideIcon name="camera" className="text-black/40 text-4xl opacity-0 group-active:opacity-100 transition-opacity duration-100" />
                        </div>
                    </button>

                    {/* Switch Camera Button */}
                    <button
                        onClick={handleFlipCamera}
                        disabled={isCapturing}
                        className="size-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white flex items-center justify-center transition-all active:scale-90 border border-white/20"
                        title="Switch Camera"
                    >
                        <DynamicLucideIcon name="flip_camera_ios" className="size-5" />
                    </button>
                </div>
            </div>

            <style jsx global>{`
                @keyframes scan {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(100%); }
                }
                .full-screen-camera {
                    position: absolute !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    height: 100dvh !important;
                    min-width: 100vw !important;
                    min-height: 100dvh !important;
                    object-fit: cover !important;
                }
            `}</style>
        </div>
    );
}
