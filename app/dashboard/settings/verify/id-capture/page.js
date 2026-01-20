'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentIDCapturePage() {
    const router = useRouter();
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    const [flash, setFlash] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [showChecking, setShowChecking] = useState(false);
    const [cameraError, setCameraError] = useState(null);

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

    const toggleFlash = () => setFlash(!flash);

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

        // Capture Frame
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        // Set canvas size to video size
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to Base64
        const imageData = canvas.toDataURL('image/jpeg', 0.8);

        // Save to sessionStorage
        sessionStorage.setItem('capturedIDImage', imageData);

        // Show "Checking clarity" after flash
        setTimeout(() => {
            setShowChecking(true);
            setTimeout(() => {
                router.push('/dashboard/settings/verify/review');
            }, 2000);
        }, 300);
    };

    return (
        <div className="bg-[#f6f7f8] dark:bg-[#111d21] font-display antialiased min-h-screen flex flex-col items-center justify-center p-0 sm:p-4 transition-colors duration-200">
            {/* Mobile Frame Simulation */}
            <div className="relative w-full sm:max-w-[400px] h-screen sm:h-[850px] bg-black sm:rounded-[2.5rem] overflow-hidden shadow-2xl sm:border-8 sm:border-neutral-900 flex flex-col group/design-root">

                {/* Flash Overlay */}
                <div id="flash-overlay" className="absolute inset-0 bg-white z-[100] pointer-events-none opacity-0 transition-opacity duration-75"></div>

                {/* Real Camera Feed Layer */}
                <div className="absolute inset-0 z-0 bg-neutral-900 flex items-center justify-center">
                    {cameraError ? (
                        <div className="text-white text-center px-8">
                            <span className="material-symbols-outlined text-4xl mb-4 text-red-500">videocam_off</span>
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
                            className="w-full h-full object-cover scale-x-[-1]" // Mirror for better UX if front camera, though we prefer back
                            style={{ transform: streamRef.current?.getTracks()[0]?.getSettings()?.facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
                        />
                    )}
                    <div className="absolute inset-0 bg-black/20"></div>
                </div>

                {/* Hidden Canvas for Capture */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Header Area */}
                <div className="relative z-20 w-full pt-12 pb-4 px-6 flex flex-col gap-5 bg-gradient-to-b from-black/80 to-transparent">
                    <div className="flex items-center justify-between text-white">
                        <button
                            onClick={() => router.back()}
                            className="flex items-center justify-center size-10 rounded-full bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-md border border-white/10"
                        >
                            <span className="material-symbols-outlined text-xl">arrow_back</span>
                        </button>
                        <h1 className="text-lg font-bold tracking-tight text-white flex-1 text-center pr-10">Verify Identity</h1>
                    </div>
                    {/* Step Indicators */}
                    <div className="flex w-full justify-center gap-2.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-white/30"></div>
                        <div className="h-1.5 w-8 rounded-full bg-primary shadow-[0_0_12px_rgba(29,173,221,0.6)]"></div>
                        <div className="h-1.5 w-1.5 rounded-full bg-white/30"></div>
                    </div>
                </div>

                {/* Main Viewfinder Section */}
                <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full">
                    <h2 className="text-2xl font-bold text-white text-center mb-10 drop-shadow-lg px-8 leading-tight">
                        {showChecking ? "Processing capture..." : "Position your Student ID within the frame"}
                    </h2>

                    {/* The Cutout/Viewfinder */}
                    <div className="relative w-full max-w-[340px] aspect-[1.58/1] rounded-2xl mx-6 group">
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
                        {!showChecking && (
                            <div className="absolute inset-0 overflow-hidden rounded-2xl z-20">
                                <div className="w-full h-[50%] bg-gradient-to-b from-primary/0 via-primary/10 to-primary/0 animate-[scan_3s_cubic-bezier(0.4,0,0.2,1)_infinite] border-b border-primary/40"
                                    style={{ animationName: 'scan' }}
                                ></div>
                            </div>
                        )}

                        {/* Corner Markers */}
                        <div className="absolute -top-1 -left-1 size-8 border-t-[4px] border-l-[4px] border-primary rounded-tl-2xl z-30 drop-shadow-[0_0_8px_rgba(29,173,221,0.5)]"></div>
                        <div className="absolute -top-1 -right-1 size-8 border-t-[4px] border-r-[4px] border-primary rounded-tr-2xl z-30 drop-shadow-[0_0_8px_rgba(29,173,221,0.5)]"></div>
                        <div className="absolute -bottom-1 -left-1 size-8 border-b-[4px] border-l-[4px] border-primary rounded-bl-2xl z-30 drop-shadow-[0_0_8px_rgba(29,173,221,0.5)]"></div>
                        <div className="absolute -bottom-1 -right-1 size-8 border-b-[4px] border-r-[4px] border-primary rounded-br-2xl z-30 drop-shadow-[0_0_8px_rgba(29,173,221,0.5)]"></div>

                        {/* Center Crosshair */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-4 opacity-50 z-20">
                            <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white"></div>
                            <div className="absolute top-0 left-1/2 h-full w-[1px] bg-white"></div>
                        </div>

                        {/* Checking clarity overlay */}
                        {showChecking && (
                            <div className="absolute inset-0 z-40 bg-black/60 flex flex-col items-center justify-center animate-in fade-in duration-500">
                                <div className="size-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
                                <p className="text-white font-bold">Checking clarity...</p>
                            </div>
                        )}
                    </div>

                    {/* Helper Pill */}
                    {!showChecking && (
                        <div className="mt-10 relative z-20">
                            <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-md">
                                <span className="material-symbols-outlined text-primary text-lg animate-pulse">wb_incandescent</span>
                                <p className="text-white text-sm font-medium tracking-wide">Avoid glare and shadows</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Controls */}
                <div className="relative z-20 pb-12 pt-6 px-8 bg-gradient-to-t from-black via-black/90 to-transparent w-full">
                    <div className="flex items-center justify-between max-w-[340px] mx-auto">
                        {/* Flash Toggle */}
                        <button
                            onClick={toggleFlash}
                            className={`group flex flex-col items-center justify-center gap-1 active:scale-95 transition-all ${flash ? 'text-primary' : 'text-white'}`}
                        >
                            <div className={`flex items-center justify-center size-12 rounded-full ${flash ? 'bg-primary/20 border-primary' : 'bg-white/10 border-white/5'} transition backdrop-blur-md border`}>
                                <span className="material-symbols-outlined text-xl">{flash ? 'flash_on' : 'flash_off'}</span>
                            </div>
                        </button>

                        {/* Primary Shutter Button */}
                        <button
                            onClick={handleCapture}
                            disabled={isCapturing || !!cameraError}
                            className={`relative flex items-center justify-center size-[84px] rounded-full border-4 border-white transition-all active:scale-95 group shadow-2xl disabled:opacity-50`}
                        >
                            <div className="absolute inset-0 rounded-full bg-white/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className={`size-[68px] rounded-full ${isCapturing ? 'bg-gray-400' : 'bg-primary'} group-hover:bg-[#159ac6] transition-colors shadow-inner flex items-center justify-center relative overflow-hidden`}>
                                <span className="material-symbols-outlined text-black/40 text-4xl opacity-0 group-active:opacity-100 transition-opacity duration-100">camera</span>
                            </div>
                        </button>

                        {/* Help Button */}
                        <button
                            onClick={() => setIsHelpOpen(true)}
                            className="group flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"
                        >
                            <div className="flex items-center justify-center size-12 rounded-full bg-transparent text-white/60 hover:text-white hover:bg-white/10 transition border border-transparent hover:border-white/10">
                                <span className="material-symbols-outlined text-xl">help</span>
                            </div>
                        </button>
                    </div>
                    <p className="text-center text-white/30 text-xs mt-6 font-medium tracking-wider uppercase">Auto-capture enabled</p>
                </div>

                {/* Help Modal */}
                {isHelpOpen && (
                    <div className="absolute inset-0 z-[101] bg-black/90 flex items-center justify-center p-6 animate-in fade-in duration-300">
                        <div className="bg-[#1e292b] rounded-3xl p-8 max-w-xs w-full border border-white/10 text-white relative">
                            <button
                                onClick={() => setIsHelpOpen(false)}
                                className="absolute top-4 right-4 text-white/40 hover:text-white"
                            >
                                <span className="material-symbols-outlined font-bold">close</span>
                            </button>
                            <div className="flex flex-col items-center text-center">
                                <div className="size-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 text-primary">
                                    <span className="material-symbols-outlined text-[40px]">info</span>
                                </div>
                                <h3 className="text-xl font-bold mb-4">How to take a clear photo</h3>
                                <ul className="text-sm text-white/60 space-y-3 text-left w-full">
                                    <li className="flex gap-3">
                                        <span className="text-primary font-bold">1.</span>
                                        <span>Hold your ID within the corner markers until they turn green.</span>
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="text-primary font-bold">2.</span>
                                        <span>Ensure there is adequate light and no glare on the ID.</span>
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="text-primary font-bold">3.</span>
                                        <span>Avoid covering any information with your fingers.</span>
                                    </li>
                                </ul>
                                <button
                                    onClick={() => setIsHelpOpen(false)}
                                    className="mt-8 w-full py-3 bg-primary rounded-xl font-bold"
                                >
                                    Got it
                                </button>
                            </div>
                        </div>
                    </div>
                )}
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
