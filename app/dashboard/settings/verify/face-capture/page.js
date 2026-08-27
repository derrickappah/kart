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
    const fileInputRef = useRef(null);

    const [isCapturing, setIsCapturing] = useState(false);
    const [showChecking, setShowChecking] = useState(false);
    const [cameraError, setCameraError] = useState(null);
    const [facingMode, setFacingMode] = useState('user');
    const [capturedImage, setCapturedImage] = useState(null);

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

    // Progressive Camera Initializer with fallbacks
    const startCamera = useCallback(async () => {
        setCameraError(null);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (!navigator?.mediaDevices?.getUserMedia) {
            setCameraError("Camera is not supported on this browser. Please upload a selfie instead.");
            return;
        }

        const constraintSets = [
            { video: { facingMode: { ideal: "user" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false },
            { video: { facingMode: { ideal: "user" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
            { video: { facingMode: { ideal: "user" } }, audio: false },
            { video: { facingMode: "user" }, audio: false },
            { video: true, audio: false }
        ];

        let stream = null;
        let lastError = null;

        for (const constraints of constraintSets) {
            try {
                stream = await navigator.mediaDevices.getUserMedia(constraints);
                if (stream) break;
            } catch (err) {
                lastError = err;
                console.warn("Camera constraint failed, trying fallback:", err);
            }
        }

        if (stream && videoRef.current) {
            videoRef.current.srcObject = stream;
            streamRef.current = stream;
            const track = stream.getVideoTracks()[0];
            const actualFacingMode = track?.getSettings()?.facingMode;
            if (actualFacingMode) {
                setFacingMode(actualFacingMode);
            }
            setCameraError(null);
        } else if (lastError) {
            console.error("Error accessing camera:", lastError);
            if (lastError.name === 'NotAllowedError' || lastError.name === 'PermissionDeniedError') {
                setCameraError("Camera access denied. Please allow camera permissions in your browser settings.");
            } else if (lastError.name === 'NotFoundError' || lastError.name === 'DevicesNotFoundError') {
                setCameraError("No camera detected on this device. You can upload a selfie below.");
            } else if (lastError.name === 'NotReadableError' || lastError.name === 'TrackStartError') {
                setCameraError("Camera is in use by another app or tab. Please close other camera apps and retry.");
            } else {
                setCameraError("Unable to access camera. Please check permissions or upload a selfie.");
            }
        }
    }, []);

    useEffect(() => {
        startCamera();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [startCamera]);

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result;
            if (dataUrl) {
                setCapturedImage(dataUrl);
                sessionStorage.setItem('capturedFaceImage', dataUrl);
                setShowChecking(true);
                setTimeout(() => {
                    router.push('/dashboard/settings/verify/review');
                }, 1500);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleCapture = () => {
        if (!videoRef.current || !canvasRef.current || isCapturing) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const vWidth = video.videoWidth;
        const vHeight = video.videoHeight;

        if (!vWidth || !vHeight) {
            console.error("Video dimensions not available");
            return;
        }

        setIsCapturing(true);

        // Instant flash effect
        const flashOverlay = document.getElementById('flash-overlay');
        if (flashOverlay) {
            flashOverlay.style.opacity = '1';
            setTimeout(() => {
                flashOverlay.style.opacity = '0';
            }, 100);
        }

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
                    sX = Math.max(0, vWidth - (sX + sWidth));
                }
            }
        }

        // Safety fallback if calculation results in 0
        if (!sWidth || !sHeight || sWidth <= 0 || sHeight <= 0) {
            sX = 0;
            sY = 0;
            sWidth = vWidth;
            sHeight = vHeight;
        }

        canvas.width = sWidth;
        canvas.height = sHeight;
        const context = canvas.getContext('2d');

        if (facingMode === 'user') {
            context.translate(canvas.width, 0);
            context.scale(-1, 1);
        }

        context.drawImage(video, sX, sY, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg', 0.85);

        setCapturedImage(imageData);
        sessionStorage.setItem('capturedFaceImage', imageData);

        // Show "Checking clarity" after flash
        setTimeout(() => {
            setShowChecking(true);
            setTimeout(() => {
                router.push('/dashboard/settings/verify/review');
            }, 2000);
        }, 300);
    };

    return (
        <div className="fixed inset-0 z-[999] bg-black font-display antialiased w-screen h-screen h-[100dvh] overflow-hidden select-none touch-none">
            {/* Flash Overlay */}
            <div id="flash-overlay" className="absolute inset-0 bg-white z-[100] pointer-events-none opacity-0 transition-opacity duration-75"></div>

            {/* Hidden Canvas for Capture */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Hidden File Input Fallback */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="user"
                onChange={handleFileUpload}
                className="hidden"
            />

            {/* Real Camera Feed Layer (Full Screen Background Canvas) */}
            <div ref={containerRef} className="absolute inset-0 z-0 bg-neutral-900 overflow-hidden">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover min-w-full min-h-full"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        minWidth: '100vw',
                        minHeight: '100vh',
                        objectFit: 'cover',
                        transform: facingMode === 'user' ? 'scaleX(-1)' : 'none'
                    }}
                />
            </div>

            {/* Camera Error Overlay Modal */}
            {cameraError && (
                <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white animate-in fade-in duration-300">
                    <div className="size-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mb-4 border border-red-500/20">
                        <DynamicLucideIcon name="videocam_off" className="text-3xl" />
                    </div>
                    <h3 className="font-bold text-base text-white mb-2">Camera Access Issue</h3>
                    <p className="text-xs text-white/70 max-w-xs mb-6 leading-relaxed">{cameraError}</p>
                    <div className="flex flex-col gap-3 w-full max-w-[260px]">
                        <button
                            type="button"
                            onClick={() => startCamera()}
                            className="w-full py-3.5 bg-primary hover:bg-[#159ac6] active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                        >
                            <DynamicLucideIcon name="refresh" className="size-4" />
                            Retry Camera Access
                        </button>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full py-3.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl text-xs font-bold transition-all border border-white/20 flex items-center justify-center gap-2"
                        >
                            <DynamicLucideIcon name="photo_camera" className="size-4" />
                            Upload Selfie from Device
                        </button>
                    </div>
                </div>
            )}

            {/* Single Viewport Overlay (Header, Centered Oval Scanner, Capture Button) */}
            <div className="absolute inset-0 z-10 flex flex-col justify-between items-center pointer-events-none py-6 px-4 sm:py-8 sm:px-6">
                {/* Header Text */}
                <div className="pointer-events-auto w-full pt-6 sm:pt-8 text-center relative z-30">
                    <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white drop-shadow-lg px-4">
                        {showChecking ? "Processing capture..." : "Position your face within the frame"}
                    </h1>
                </div>

                {/* Center Oval Scanner Viewfinder */}
                <div className="pointer-events-auto flex-1 w-full flex items-center justify-center px-4 min-h-0 relative z-10">
                    <div
                        ref={viewfinderRef}
                        className="relative w-full max-w-[280px] sm:max-w-[300px] aspect-[1/1.3] rounded-[50%] shadow-2xl shrink-0"
                    >
                        {/* Cutout Mask (Dark Translucent Overlay outside oval viewfinder) */}
                        <div
                            className="absolute inset-0 rounded-[inherit] pointer-events-none z-10"
                            style={{ boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)' }}
                        ></div>

                        {/* Viewfinder Inner Contents (Clipped to oval) */}
                        <div className="absolute inset-0 overflow-hidden rounded-[inherit] z-0">
                            {/* Grid Overlay */}
                            <div className="absolute inset-0 opacity-30 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[length:40px_40px]"></div>

                            {/* Active Scanning Animation Line */}
                            {!showChecking && !capturedImage && (
                                <div className="absolute inset-0 overflow-hidden rounded-[inherit] z-20">
                                    <div
                                        className="w-full h-[50%] bg-gradient-to-b from-primary/0 via-primary/20 to-primary/0 animate-[scan_3s_cubic-bezier(0.4,0,0.2,1)_infinite] border-b-2 border-primary"
                                        style={{ animationName: 'scan' }}
                                    ></div>
                                </div>
                            )}

                            {/* Captured Image Display */}
                            {capturedImage && (
                                <img
                                    src={capturedImage}
                                    alt="Captured Face"
                                    className="absolute inset-0 w-full h-full object-cover rounded-[inherit] z-25"
                                />
                            )}

                            {/* Center Crosshair */}
                            {!capturedImage && (
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-4 opacity-50 z-20">
                                    <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white"></div>
                                    <div className="absolute top-0 left-1/2 h-full w-[1px] bg-white"></div>
                                </div>
                            )}

                            {/* Checking Clarity Overlay */}
                            {showChecking && (
                                <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center animate-in fade-in duration-500">
                                    <div className="size-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
                                    <p className="text-white font-bold">Checking clarity...</p>
                                </div>
                            )}
                        </div>

                        {/* Oval Glowing Border Guide */}
                        <div className="absolute -inset-[2px] rounded-[inherit] border-2 border-primary pointer-events-none z-30 drop-shadow-[0_0_10px_rgba(29,173,221,0.6)]"></div>
                    </div>
                </div>

                {/* Bottom Shutter & Upload Buttons */}
                <div className="pointer-events-auto w-full pb-6 sm:pb-8 flex flex-col items-center gap-4 relative z-30">
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

                    {/* Quick Upload Alternative Button */}
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white/90 text-xs font-bold backdrop-blur-md border border-white/15 flex items-center gap-1.5 transition-all active:scale-95"
                    >
                        <DynamicLucideIcon name="upload" className="size-3.5" />
                        <span>Or upload selfie image</span>
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
