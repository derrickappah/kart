'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { dataURItoBlob } from '@/utils/imageUtils';

/**
 * In-App Live Camera Viewfinder Modal
 * 
 * Allows taking multiple photos sequentially directly inside the web application
 * without switching out to the device's native camera app.
 * Displays real-time captured thumbnails in a bottom horizontal tray.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the camera viewfinder is visible
 * @param {Function} props.onClose - Callback when camera is closed
 * @param {Function} props.onPhotosCaptured - Callback with array of captured items { dataUrl, blob, file }
 * @param {number} props.maxPhotos - Maximum number of photos allowed in this session
 * @param {number} props.replaceIndex - Index if replacing a single photo
 */
export default function InAppCameraModal({
    isOpen,
    onClose,
    onPhotosCaptured,
    maxPhotos = 5,
    replaceIndex = null,
}) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const fileInputFallbackRef = useRef(null);

    const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) or 'user' (front)
    const [cameraReady, setCameraReady] = useState(false);
    const [cameraError, setCameraError] = useState(null);
    const [capturedPhotos, setCapturedPhotos] = useState([]);
    const [isFlashActive, setIsFlashActive] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);

    const isReplacing = replaceIndex !== null;
    const effectiveLimit = isReplacing ? 1 : Math.max(1, maxPhotos);

    // Stop all media tracks safely
    const stopStream = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => {
                try {
                    track.stop();
                } catch {
                    // Ignore track stop errors
                }
            });
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setCameraReady(false);
    }, []);

    // Start camera stream with progressive resolution constraints
    const startCamera = useCallback(async (mode = facingMode) => {
        stopStream();
        setCameraError(null);
        setCameraReady(false);

        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
            setCameraError('Live camera is not supported on this browser. You can upload photos directly.');
            return;
        }

        const constraintSets = [
            { video: { facingMode: { ideal: mode }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false },
            { video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
            { video: { facingMode: { ideal: mode } }, audio: false },
            { video: { facingMode: mode }, audio: false },
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
                console.warn('[InAppCamera] Constraint attempt failed:', err);
            }
        }

        if (stream && videoRef.current) {
            videoRef.current.srcObject = stream;
            streamRef.current = stream;

            try {
                await videoRef.current.play();
            } catch {
                // Ignore autoplay policies
            }

            const track = stream.getVideoTracks()[0];
            const actualFacing = track?.getSettings()?.facingMode;
            if (actualFacing) {
                setFacingMode(actualFacing);
            }
            setCameraReady(true);
            setCameraError(null);
        } else if (lastError) {
            console.error('[InAppCamera] Camera access error:', lastError);
            if (lastError.name === 'NotAllowedError' || lastError.name === 'PermissionDeniedError') {
                setCameraError('Camera permission was denied. Please enable camera access in your browser settings.');
            } else if (lastError.name === 'NotFoundError' || lastError.name === 'DevicesNotFoundError') {
                setCameraError('No camera found on this device. You can upload a photo from your gallery.');
            } else if (lastError.name === 'NotReadableError' || lastError.name === 'TrackStartError') {
                setCameraError('Camera is currently in use by another app. Please close other camera apps and try again.');
            } else {
                setCameraError('Unable to access camera stream. Please try uploading from your gallery.');
            }
        }
    }, [facingMode, stopStream]);

    // Handle modal lifecycle
    useEffect(() => {
        if (isOpen) {
            setCapturedPhotos([]);
            startCamera('environment');
        } else {
            stopStream();
        }

        return () => {
            stopStream();
        };
    }, [isOpen, startCamera, stopStream]);

    // Switch between front and rear cameras
    const toggleFacingMode = () => {
        const nextMode = facingMode === 'environment' ? 'user' : 'environment';
        setFacingMode(nextMode);
        startCamera(nextMode);
    };

    // Shutter capture action
    const takePhoto = () => {
        if (!videoRef.current || !canvasRef.current || isCapturing) return;
        if (capturedPhotos.length >= effectiveLimit) return;

        setIsCapturing(true);

        // Flash & Haptic Feedback
        setIsFlashActive(true);
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try {
                navigator.vibrate(50);
            } catch {
                // Ignore vibration error
            }
        }
        setTimeout(() => setIsFlashActive(false), 120);

        try {
            const video = videoRef.current;
            const canvas = canvasRef.current;

            const vWidth = video.videoWidth || video.clientWidth || 1280;
            const vHeight = video.videoHeight || video.clientHeight || 720;

            canvas.width = vWidth;
            canvas.height = vHeight;

            const ctx = canvas.getContext('2d', { colorSpace: 'srgb' }) || canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, vWidth, vHeight);

                // Mirror if front-facing camera
                if (facingMode === 'user') {
                    ctx.translate(vWidth, 0);
                    ctx.scale(-1, 1);
                }

                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(video, 0, 0, vWidth, vHeight);

                const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                const blob = dataURItoBlob(dataUrl);
                const file = new File([blob], `camera-shot-${Date.now()}-${capturedPhotos.length + 1}.jpg`, { type: 'image/jpeg' });

                const newPhoto = {
                    id: Date.now() + Math.random(),
                    dataUrl,
                    blob,
                    file,
                    previewUrl: dataUrl,
                };

                setCapturedPhotos((prev) => {
                    const updated = [...prev, newPhoto];
                    // If replacing single photo, automatically submit
                    if (isReplacing) {
                        setTimeout(() => {
                            onPhotosCaptured([file], replaceIndex);
                            onClose();
                        }, 250);
                    }
                    return updated;
                });
            }
        } catch (err) {
            console.error('[InAppCamera] Capture error:', err);
        } finally {
            setIsCapturing(false);
        }
    };

    // Remove photo from bottom tray
    const removeCapturedPhoto = (index) => {
        setCapturedPhotos((prev) => prev.filter((_, i) => i !== index));
    };

    // Commit photos and return to listing
    const handleDone = () => {
        if (capturedPhotos.length === 0) {
            onClose();
            return;
        }

        const files = capturedPhotos.map((p) => p.file || p.blob);
        onPhotosCaptured(files, replaceIndex);
        onClose();
    };

    // Fallback file picker handler
    const handleFallbackUpload = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            onPhotosCaptured(files, replaceIndex);
            onClose();
        }
        e.target.value = '';
    };

    if (!isOpen) return null;

    const isLimitReached = capturedPhotos.length >= effectiveLimit;

    return (
        <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[10000] bg-black font-display antialiased w-screen h-screen h-[100dvh] overflow-hidden select-none flex flex-col justify-between"
        >
            {/* Hidden Canvas for High-Res Capture */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Hidden File Input for Direct Gallery Fallback */}
            <input
                ref={fileInputFallbackRef}
                type="file"
                accept="image/*"
                multiple={!isReplacing}
                onChange={handleFallbackUpload}
                className="hidden"
            />

            {/* Flash Screen Overlay */}
            <div
                className={`absolute inset-0 bg-white pointer-events-none z-[60] transition-opacity duration-100 ${
                    isFlashActive ? 'opacity-100' : 'opacity-0'
                }`}
            />

            {/* Top Navigation Bar */}
            <header className="relative z-50 px-4 pt-4 sm:pt-6 pb-3 flex items-center justify-between text-white bg-gradient-to-b from-black/80 via-black/40 to-transparent">
                {/* Close Button */}
                <button
                    type="button"
                    onClick={onClose}
                    className="size-10 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/25 active:scale-95 transition-all shadow-md"
                    aria-label="Close camera"
                >
                    <DynamicLucideIcon name="close" className="text-xl" />
                </button>

                {/* Photo Counter Pill */}
                <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/10 shadow-md">
                    <div className="size-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-xs font-black tracking-wide text-white">
                        {capturedPhotos.length} / {effectiveLimit} Photos
                    </span>
                </div>

                {/* Flip Camera Button */}
                <button
                    type="button"
                    onClick={toggleFacingMode}
                    className="size-10 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/25 active:scale-95 transition-all shadow-md"
                    title="Flip camera"
                    aria-label="Flip camera"
                >
                    <DynamicLucideIcon name="flip_camera_ios" className="text-xl" />
                </button>
            </header>

            {/* Viewfinder Video Area */}
            <main className="relative flex-1 flex items-center justify-center overflow-hidden bg-neutral-950">
                {cameraError ? (
                    <div className="p-6 text-center max-w-sm mx-auto space-y-4">
                        <div className="size-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
                            <DynamicLucideIcon name="camera_off" className="text-3xl" />
                        </div>
                        <h4 className="text-lg font-bold text-white tracking-tight">Camera Unavailable</h4>
                        <p className="text-xs text-gray-300 leading-relaxed">{cameraError}</p>
                        <div className="pt-2 flex flex-col gap-2">
                            <button
                                type="button"
                                onClick={() => startCamera()}
                                className="w-full py-3 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs active:scale-98 transition-all"
                            >
                                Try Again
                            </button>
                            <button
                                type="button"
                                onClick={() => fileInputFallbackRef.current?.click()}
                                className="w-full py-3 rounded-xl bg-primary hover:bg-[#179ecb] text-white font-bold text-xs active:scale-98 transition-all shadow-lg shadow-primary/30"
                            >
                                Choose from Gallery Instead
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className={`w-full h-full object-cover ${
                                facingMode === 'user' ? 'scale-x-[-1]' : ''
                            }`}
                        />

                        {/* Subtle Center Target Framing Box */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
                            <div className="w-full max-w-[340px] aspect-[4/3] rounded-3xl border border-white/20 shadow-[0_0_0_9999px_rgba(0,0,0,0.3)] transition-all" />
                        </div>

                        {!cameraReady && (
                            <div className="absolute inset-0 bg-black flex flex-col items-center justify-center text-white gap-3 z-30">
                                <div className="size-10 border-3 border-white/20 border-t-primary rounded-full animate-spin" />
                                <span className="text-xs font-bold tracking-wide text-gray-300">Starting Camera...</span>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Bottom Tray & Controls */}
            <footer className="relative z-50 bg-gradient-to-t from-black via-black/90 to-transparent pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3 px-4 flex flex-col gap-4">
                {/* 1. Horizontal Captured Photos Tray */}
                {capturedPhotos.length > 0 && (
                    <div className="w-full overflow-x-auto no-scrollbar flex items-center gap-2.5 px-2 py-1">
                        {capturedPhotos.map((photo, idx) => (
                            <div
                                key={photo.id}
                                className="relative shrink-0 size-16 rounded-2xl overflow-hidden border-2 border-white/40 shadow-lg group animate-in zoom-in-90 duration-150"
                            >
                                <img
                                    src={photo.previewUrl}
                                    alt={`Captured shot ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeCapturedPhoto(idx)}
                                    className="absolute top-1 right-1 size-5 bg-red-600/90 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-700 active:scale-90 transition-all"
                                    title="Delete photo"
                                    aria-label="Delete photo"
                                >
                                    <DynamicLucideIcon name="close" className="text-[10px]" />
                                </button>
                                <div className="absolute bottom-0.5 left-1 text-[9px] font-black text-white drop-shadow-md">
                                    #{idx + 1}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 2. Shutter & Action Bar */}
                <div className="flex items-center justify-between px-3 sm:px-6">
                    {/* Left: Gallery Shortcut */}
                    <button
                        type="button"
                        onClick={() => fileInputFallbackRef.current?.click()}
                        className="flex flex-col items-center gap-1 text-white/80 hover:text-white active:scale-95 transition-all"
                        title="Upload from gallery"
                    >
                        <div className="size-11 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center">
                            <DynamicLucideIcon name="image" className="text-xl" />
                        </div>
                        <span className="text-[10px] font-bold">Gallery</span>
                    </button>

                    {/* Center: Camera Shutter Button */}
                    <div className="flex flex-col items-center gap-1">
                        <button
                            type="button"
                            disabled={!cameraReady || isLimitReached || isCapturing}
                            onClick={takePhoto}
                            className={`size-20 rounded-full border-4 border-white p-1 flex items-center justify-center transition-all shadow-2xl active:scale-90 ${
                                isLimitReached
                                    ? 'opacity-40 cursor-not-allowed border-gray-500'
                                    : 'hover:border-primary cursor-pointer'
                            }`}
                            aria-label="Capture photo"
                        >
                            <div
                                className={`size-full rounded-full transition-all ${
                                    isLimitReached ? 'bg-gray-500' : 'bg-white hover:bg-primary'
                                }`}
                            />
                        </button>
                        {isLimitReached && (
                            <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">
                                Max Limit
                            </span>
                        )}
                    </div>

                    {/* Right: Done / Add to Listing Button */}
                    <button
                        type="button"
                        onClick={handleDone}
                        disabled={capturedPhotos.length === 0}
                        className={`flex flex-col items-center gap-1 transition-all ${
                            capturedPhotos.length > 0
                                ? 'text-primary hover:text-white active:scale-95'
                                : 'opacity-40 cursor-not-allowed text-white/50'
                        }`}
                        title="Add captured photos to listing"
                    >
                        <div
                            className={`size-11 rounded-2xl flex items-center justify-center font-bold text-sm shadow-lg transition-all ${
                                capturedPhotos.length > 0
                                    ? 'bg-primary text-white shadow-primary/30'
                                    : 'bg-white/15 backdrop-blur-md text-white'
                            }`}
                        >
                            <DynamicLucideIcon name="check" className="text-xl font-bold" />
                        </div>
                        <span className="text-[10px] font-bold">
                            {capturedPhotos.length > 0 ? `Done (${capturedPhotos.length})` : 'Done'}
                        </span>
                    </button>
                </div>
            </footer>
        </div>
    );
}
