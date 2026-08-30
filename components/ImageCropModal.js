'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { getCroppedImg } from '@/utils/imageUtils';

export const PREDEFINED_RATIOS = [
    { label: '4:3', value: 4 / 3, name: 'Product' },
    { label: '1:1', value: 1 / 1, name: 'Square' },
    { label: '3:4', value: 3 / 4, name: 'Portrait' },
    { label: '16:9', value: 16 / 9, name: 'Wide' },
    { label: 'Free', value: undefined, name: 'Free' },
];

export default function ImageCropModal({
    isOpen,
    images = [],
    initialIndex = 0,
    onCropDone,
    onCancel,
}) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [aspect, setAspect] = useState(4 / 3);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [resultsAccumulator, setResultsAccumulator] = useState([]);

    // Reset when modal opens
    useEffect(() => {
        if (isOpen && images && images.length > 0) {
            const startIdx = Math.min(Math.max(0, initialIndex), images.length - 1);
            setCurrentIndex(startIdx);
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setRotation(0);
            setAspect(4 / 3);
            setCroppedAreaPixels(null);
            setResultsAccumulator([]);
            setIsProcessing(false);
        }
    }, [isOpen, images, initialIndex]);

    const total = images.length;
    const currentItem = images[currentIndex];
    const currentSrc = currentItem?.src || currentItem?.originalSrc || currentItem?.dataUrl || (typeof currentItem === 'string' ? currentItem : null);
    const isLast = currentIndex >= total - 1;

    const onCropChange = useCallback((newCrop) => {
        setCrop(newCrop);
    }, []);

    const onZoomChange = useCallback((newZoom) => {
        setZoom(newZoom);
    }, []);

    const onCropCompleteCallback = useCallback((_, croppedPixels) => {
        setCroppedAreaPixels(croppedPixels);
    }, []);

    const handleRotate = () => {
        setRotation((r) => (r + 90) % 360);
    };

    const handleReset = () => {
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setRotation(0);
        setAspect(4 / 3);
    };

    const processCurrentCrop = async (shouldSkip = false) => {
        if (!currentSrc) return null;

        if (shouldSkip || !croppedAreaPixels) {
            return {
                originalSrc: currentItem?.originalSrc || currentSrc,
                dataUrl: typeof currentSrc === 'string' && currentSrc.startsWith('data:') ? currentSrc : null,
                previewUrl: currentSrc,
                file: currentItem?.rawFile || currentItem?.file || null,
                isCropped: false,
            };
        }

        try {
            const cropped = await getCroppedImg(
                currentSrc,
                croppedAreaPixels,
                rotation,
                { horizontal: false, vertical: false }
            );

            if (!cropped) throw new Error('Crop failed');

            return {
                originalSrc: currentItem?.originalSrc || currentSrc,
                dataUrl: cropped.dataUrl,
                blob: cropped.blob,
                previewUrl: cropped.dataUrl,
                file: cropped.blob,
                isCropped: true,
                aspectRatio: aspect,
            };
        } catch (err) {
            console.error('[ImageCropModal] Error cropping image:', err);
            return {
                originalSrc: currentItem?.originalSrc || currentSrc,
                dataUrl: typeof currentSrc === 'string' && currentSrc.startsWith('data:') ? currentSrc : null,
                previewUrl: currentSrc,
                file: currentItem?.rawFile || currentItem?.file || null,
                isCropped: false,
            };
        }
    };

    const handleConfirm = async (skip = false) => {
        if (isProcessing) return;
        setIsProcessing(true);

        try {
            const cropped = await processCurrentCrop(skip);
            const nextList = [...resultsAccumulator, cropped];

            if (isLast) {
                if (onCropDone) {
                    onCropDone(nextList);
                }
            } else {
                setResultsAccumulator(nextList);
                setCurrentIndex((i) => i + 1);
                setCrop({ x: 0, y: 0 });
                setZoom(1);
                setRotation(0);
                setCroppedAreaPixels(null);
            }
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen || !currentSrc) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in"
        >
            <div className="bg-white dark:bg-[#1E2428] rounded-[28px] shadow-2xl max-w-[420px] w-full overflow-hidden border border-gray-100 dark:border-white/10 flex flex-col animate-in zoom-in-95 duration-200">
                
                {/* 1. Header */}
                <div className="px-5 py-3.5 flex items-center justify-between border-b border-gray-100 dark:border-white/5">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isProcessing}
                        className="text-xs font-bold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                    >
                        Cancel
                    </button>

                    <div className="text-center">
                        <h3 className="text-sm font-black text-gray-900 dark:text-white tracking-tight">
                            Crop Image
                        </h3>
                        {total > 1 && (
                            <p className="text-[10px] font-bold text-primary">
                                Photo {currentIndex + 1} of {total}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={handleRotate}
                            title="Rotate 90°"
                            className="size-8 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                        >
                            <DynamicLucideIcon name="flip_camera_ios" className="text-base" />
                        </button>
                        <button
                            type="button"
                            onClick={handleReset}
                            title="Reset"
                            className="size-8 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                        >
                            <DynamicLucideIcon name="refresh" className="text-sm" />
                        </button>
                    </div>
                </div>

                {/* 2. Crop Viewport */}
                <div className="relative w-full h-[280px] sm:h-[320px] bg-[#0A0D0E] overflow-hidden select-none">
                    <Cropper
                        key={`crop-${currentIndex}-${currentSrc}`}
                        image={currentSrc}
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        aspect={aspect}
                        onCropChange={onCropChange}
                        onZoomChange={onZoomChange}
                        onCropComplete={onCropCompleteCallback}
                        showGrid={true}
                        cropShape="rect"
                        classes={{
                            containerClassName: 'w-full h-full',
                            cropAreaClassName: 'border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] rounded-xl'
                        }}
                    />

                    {isProcessing && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white z-20 gap-2">
                            <div className="size-7 border-2 border-white/20 border-t-primary rounded-full animate-spin" />
                            <span className="text-xs font-bold">Applying crop...</span>
                        </div>
                    )}
                </div>

                {/* 3. Controls */}
                <div className="p-4 space-y-3 bg-white dark:bg-[#1E2428]">
                    {/* Predefined Aspect Ratio Pills */}
                    <div className="flex items-center justify-between gap-1.5">
                        {PREDEFINED_RATIOS.map((r) => {
                            const isSelected =
                                aspect === r.value ||
                                (aspect === undefined && r.value === undefined);
                            return (
                                <button
                                    key={r.label}
                                    type="button"
                                    onClick={() => setAspect(r.value)}
                                    className={`flex-1 py-2 px-1 rounded-xl text-xs font-extrabold transition-all text-center ${
                                        isSelected
                                            ? 'bg-primary text-white shadow-md shadow-primary/25 scale-[1.03]'
                                            : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
                                    }`}
                                >
                                    <span>{r.label}</span>
                                    <span className="block text-[9px] font-normal opacity-80">{r.name}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Zoom Slider */}
                    <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-white/5 rounded-xl">
                        <DynamicLucideIcon name="zoom_out" className="text-sm text-gray-400" />
                        <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.05}
                            value={zoom}
                            onChange={(e) => setZoom(parseFloat(e.target.value))}
                            className="flex-1 h-1.5 bg-gray-200 dark:bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <DynamicLucideIcon name="zoom_in" className="text-sm text-gray-400" />
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-1 flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => handleConfirm(true)}
                            disabled={isProcessing}
                            className="flex-1 h-12 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                        >
                            Skip Crop
                        </button>

                        <button
                            type="button"
                            onClick={() => handleConfirm(false)}
                            disabled={isProcessing}
                            className="flex-[2] h-12 bg-primary hover:bg-[#179ecb] active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2"
                        >
                            <DynamicLucideIcon name="check" className="text-base" />
                            <span>{isLast ? 'Apply Crop' : 'Next Photo'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
