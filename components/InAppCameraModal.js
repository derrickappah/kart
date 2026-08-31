'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { dataURItoBlob } from '@/utils/imageUtils';

/**
 * In-App Live Camera Viewfinder Modal
 * 
 * Beautifully styled matching modern camera design with:
 * - Rounded live video viewport
 * - Captured photos arranged in a top floating thumbnail tray
 * - Bottom floating circular controls: [ Close ✕ ]  [ Shutter ⚪ ]  [ Flip 🔄 ]
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
    const facingModeRef = useRef('environment');

    const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) or 'user' (front)
    const [cameraReady, setCameraReady] = useState(false);
    const [cameraError, setCameraError] = useState(null);
    const [capturedPhotos, setCapturedPhotos] = useState([]);
    const [isFlashActive, setIsFlashActive] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [videoDevices, setVideoDevices] = useState([]);
    const [selectedDeviceIndex, setSelectedDeviceIndex] = useState(0);

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

    // Start camera stream with exact and fallback constraints
    const startCamera = useCallback(async (targetMode = facingModeRef.current, targetDeviceId = null) => {
        stopStream();
        setCameraError(null);
        setCameraReady(false);

        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
            setCameraError('Live camera is not supported on this browser. You can upload photos directly.');
            return;
        }

        // Ordered constraint sets: try exact hardware request first to force camera switch
        const constraintSets = [];

        // 1. If explicit deviceId is known
        if (targetDeviceId) {
            constraintSets.push({
                video: { deviceId: { exact: targetDeviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } },
                audio: false
            });
            constraintSets.push({
                video: { deviceId: { exact: targetDeviceId } },
                audio: false
            });
        }

        // 2. Exact facing mode (forces hardware switch on iOS / Android)
        constraintSets.push({
            video: { facingMode: { exact: targetMode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
            audio: false
        });
        constraintSets.push({
            video: { facingMode: { exact: targetMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false
        });
        constraintSets.push({
            video: { facingMode: { exact: targetMode } },
            audio: false
        });

        // 3. Ideal facing mode fallback
        constraintSets.push({
            video: { facingMode: { ideal: targetMode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
            audio: false
        });
        constraintSets.push({
            video: { facingMode: { ideal: targetMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false
        });
        constraintSets.push({
            video: { facingMode: { ideal: targetMode } },
            audio: false
        });
        constraintSets.push({
            video: { facingMode: targetMode },
            audio: false
        });

        // 4. Ultimate fallback
        constraintSets.push({ video: true, audio: false });

        let stream = null;
        let lastError = null;

        for (const constraints of constraintSets) {
            try {
                stream = await navigator.mediaDevices.getUserMedia(constraints);
                if (stream) break;
            } catch (err) {
                lastError = err;
                console.warn('[InAppCamera] Constraint attempt failed:', constraints, err);
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

            // Refresh available video device list after permission is granted
            try {
                const allDevices = await navigator.mediaDevices.enumerateDevices();
                const vInputs = allDevices.filter((d) => d.kind === 'videoinput');
                if (vInputs.length > 0) {
                    setVideoDevices(vInputs);
                }
            } catch {
                // Ignore enumerate devices errors
            }

            facingModeRef.current = targetMode;
            setFacingMode(targetMode);
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
    }, [stopStream]);

    // Handle modal lifecycle
    useEffect(() => {
        if (isOpen) {
            setCapturedPhotos([]);
            facingModeRef.current = 'environment';
            setFacingMode('environment');
            startCamera('environment');
        } else {
            stopStream();
        }

        return () => {
            stopStream();
        };
    }, [isOpen, startCamera, stopStream]);

    // Switch between front and rear cameras
    const toggleFacingMode = async () => {
        const nextMode = facingMode === 'environment' ? 'user' : 'environment';
        facingModeRef.current = nextMode;
        setFacingMode(nextMode);

        // If multiple devices are detected, also calculate next deviceId
        let nextDeviceId = null;
        if (videoDevices.length > 1) {
            const nextIdx = (selectedDeviceIndex + 1) % videoDevices.length;
            setSelectedDeviceIndex(nextIdx);
            nextDeviceId = videoDevices[nextIdx]?.deviceId;
        }

        await startCamera(nextMode, nextDeviceId);
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

    // Remove photo from top tray
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
            className="fixed inset-0 z-[10000] bg-neutral-950/95 font-display antialiased w-screen h-screen h-[100dvh] overflow-hidden select-none flex flex-col p-2 sm:p-4"
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
                className={`absolute inset-0 bg-white pointer-events-none z-[80] transition-opacity duration-100 ${
                    isFlashActive ? 'opacity-100' : 'opacity-0'
                }`}
            />

            {/* Main Rounded Camera Container Card */}
            <div className="relative w-full h-full rounded-[32px] sm:rounded-[40px] overflow-hidden bg-neutral-900 border border-white/10 shadow-2xl flex flex-col justify-between">
                
                {/* 1. TOP SECTION: Photo Thumbnails Tray & Progress */}
                <div className="relative z-50 p-4 pt-4 sm:pt-5 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        {/* Photo Limit Badge */}
                        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/15 shadow-md">
                            <span className="size-2 rounded-full bg-primary animate-pulse" />
                            <span className="text-xs font-black tracking-wide text-white">
                                {capturedPhotos.length} / {effectiveLimit} Photos
                            </span>
                        </div>

                        {/* Top Action: Done Button */}
                        <div className="flex items-center gap-2">
                            {capturedPhotos.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleDone}
                                    className="px-4 py-1.5 rounded-full bg-primary hover:bg-[#159ac6] active:scale-95 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-primary/30 transition-all animate-in zoom-in-95 duration-150"
                                >
                                    <DynamicLucideIcon name="check" className="text-sm font-bold" />
                                    <span>Done ({capturedPhotos.length})</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Horizontal Scrolling Thumbnails Reel (Arranged at TOP with Squircle styling) */}
                    {capturedPhotos.length > 0 && (
                        <div className="w-full overflow-x-auto no-scrollbar flex items-center gap-3 py-1.5 animate-in slide-in-from-top-2 duration-200">
                            {capturedPhotos.map((photo, idx) => (
                                <div
                                    key={photo.id}
                                    className="relative shrink-0 size-15 sm:size-16 aspect-square rounded-[18px] sm:rounded-[20px] overflow-hidden border-2 border-white shadow-2xl group animate-in zoom-in-90 duration-150 ring-1 ring-black/20"
                                >
                                    <img
                                        src={photo.previewUrl}
                                        alt={`Captured shot ${idx + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeCapturedPhoto(idx)}
                                        className="absolute top-1 right-1 size-5 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-md active:scale-90 transition-all z-10 border border-white/40"
                                        title="Delete photo"
                                        aria-label="Delete photo"
                                    >
                                        <DynamicLucideIcon name="close" className="text-[10px]" />
                                    </button>
                                    <div className="absolute bottom-1 left-1.5 px-1.5 py-0.5 bg-black/60 backdrop-blur-md rounded-md text-[9px] font-black text-white drop-shadow-md">
                                        #{idx + 1}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 2. CENTER: Live Camera Video Stream */}
                <div className="absolute inset-0 z-0 flex items-center justify-center bg-neutral-950 overflow-hidden">
                    {cameraError ? (
                        <div className="p-6 text-center max-w-sm mx-auto space-y-4 z-20">
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
                                    Choose from Gallery
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

                            {!cameraReady && (
                                <div className="absolute inset-0 bg-black flex flex-col items-center justify-center text-white gap-3 z-30">
                                    <div className="size-10 border-3 border-white/20 border-t-primary rounded-full animate-spin" />
                                    <span className="text-xs font-bold tracking-wide text-gray-300">Starting Camera...</span>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* 3. BOTTOM SECTION: 3 Floating Circular Buttons [ ✕ ] [ ⚪ Shutter ] [ 🔄 Flip ] */}
                <div className="relative z-50 pb-8 sm:pb-10 pt-6 px-6 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex items-center justify-around">
                    
                    {/* Left: Circular Translucent Cancel (✕) Button */}
                    <button
                        type="button"
                        onClick={onClose}
                        className="size-14 sm:size-16 rounded-full bg-white/20 hover:bg-white/30 active:scale-90 text-white backdrop-blur-md flex items-center justify-center border border-white/25 shadow-xl transition-all"
                        title="Cancel"
                        aria-label="Cancel camera"
                    >
                        <DynamicLucideIcon name="close" className="text-2xl sm:text-3xl" />
                    </button>

                    {/* Center: Large Iconic Shutter Button */}
                    <button
                        type="button"
                        disabled={!cameraReady || isLimitReached || isCapturing}
                        onClick={takePhoto}
                        className={`size-20 sm:size-22 rounded-full border-[5px] border-white/90 p-1 flex items-center justify-center transition-all shadow-2xl active:scale-90 hover:scale-105 ${
                            isLimitReached
                                ? 'opacity-40 cursor-not-allowed border-gray-500'
                                : 'cursor-pointer'
                        }`}
                        aria-label="Take photo"
                    >
                        <div
                            className={`size-full rounded-full transition-transform ${
                                isLimitReached ? 'bg-gray-500' : 'bg-white active:scale-95'
                            }`}
                        />
                    </button>

                    {/* Right: Circular Translucent Flip (🔄) Button */}
                    <button
                        type="button"
                        onClick={toggleFacingMode}
                        className="size-14 sm:size-16 rounded-full bg-white/20 hover:bg-white/30 active:scale-90 text-white backdrop-blur-md flex items-center justify-center border border-white/25 shadow-xl transition-all"
                        title="Flip camera"
                        aria-label="Flip camera"
                    >
                        <DynamicLucideIcon name="flip_camera_ios" className="text-2xl sm:text-3xl" />
                    </button>
                </div>

            </div>
        </div>
    );
}
