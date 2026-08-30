'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { getCroppedImg } from '@/utils/imageUtils';

export const PREDEFINED_ASPECT_RATIOS = [
    { label: '4:3', value: 4 / 3, title: 'Product (4:3)', badge: 'Default' },
    { label: '1:1', value: 1 / 1, title: 'Square (1:1)', badge: 'Square' },
    { label: '3:4', value: 3 / 4, title: 'Portrait (3:4)', badge: 'Vertical' },
    { label: '16:9', value: 16 / 9, title: 'Wide (16:9)', badge: 'Landscape' },
    { label: 'Free', value: undefined, title: 'Freeform', badge: 'Custom' },
];

/**
 * ImageCropModal
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {Array<{ src: string, id?: string|number, name?: string, rawFile?: File, file?: File }>} props.images - Array of images to crop
 * @param {number} props.initialIndex - Starting index in images array
 * @param {Function} props.onCropDone - Callback with array of cropped results
 * @param {Function} props.onCancel - Callback when canceled
 */
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
    const [croppedResults, setCroppedResults] = useState([]);

    // Initialize or reset when modal opens or images change
    useEffect(() => {
        if (isOpen && images && images.length > 0) {
            const validIndex = Math.min(Math.max(0, initialIndex), images.length - 1);
            setCurrentIndex(validIndex);
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setRotation(0);
            setAspect(4 / 3);
            setCroppedAreaPixels(null);
            setCroppedResults([]);
            setIsProcessing(false);
        }
    }, [isOpen, images, initialIndex]);

    const currentItem = images && images[currentIndex];
    const currentSrc = currentItem?.src || currentItem?.originalSrc || currentItem?.dataUrl || (typeof currentItem === 'string' ? currentItem : null);
    const totalCount = images?.length || 0;
    const isLastImage = currentIndex >= totalCount - 1;

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
        setRotation((prev) => (prev + 90) % 360);
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
                isCropped: false
            };
        }

        try {
            const cropped = await getCroppedImg(
                currentSrc,
                croppedAreaPixels,
                rotation,
                { horizontal: false, vertical: false }
            );

            if (!cropped) {
                throw new Error('Could not crop image');
            }

            return {
                originalSrc: currentItem?.originalSrc || currentSrc,
                dataUrl: cropped.dataUrl,
                blob: cropped.blob,
                previewUrl: cropped.dataUrl,
                file: cropped.blob,
                isCropped: true,
                aspectRatio: aspect
            };
        } catch (err) {
            console.error('[ImageCropModal] Cropping failed:', err);
            return {
                originalSrc: currentItem?.originalSrc || currentSrc,
                dataUrl: typeof currentSrc === 'string' && currentSrc.startsWith('data:') ? currentSrc : null,
                previewUrl: currentSrc,
                file: currentItem?.rawFile || currentItem?.file || null,
                isCropped: false
            };
        }
    };

    const handleApply = async (skipCrop = false) => {
        if (isProcessing) return;
        setIsProcessing(true);

        try {
            const result = await processCurrentCrop(skipCrop);
            const nextResults = [...croppedResults, result];

            if (isLastImage) {
                if (onCropDone) {
                    onCropDone(nextResults);
                }
            } else {
                setCroppedResults(nextResults);
                setCurrentIndex((prev) => prev + 1);
                setCrop({ x: 0, y: 0 });
                setZoom(1);
                setRotation(0);
                setCroppedAreaPixels(null);
            }
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen || !currentSrc) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-[#1E1E22] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh] border border-gray-100 dark:border-gray-800">
                {/* Header */}
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800/80 flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <span className="p-1.5 bg-[#1daddd]/10 text-[#1daddd] rounded-xl inline-flex">
                                <DynamicLucideIcon name="crop" className="text-lg" />
                            </span>
                            Crop & Frame Photo
                        </h3>
                        {totalCount > 1 && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
                                Photo {currentIndex + 1} of {totalCount}
                            </p>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isProcessing}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-[#2E2E32] transition-colors"
                        aria-label="Close"
                    >
                        <DynamicLucideIcon name="close" className="text-lg" />
                    </button>
                </div>

                {/* Cropper Viewport */}
                <div className="relative w-full aspect-[4/3] bg-[#121214] overflow-hidden select-none">
                    <Cropper
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
                            cropAreaClassName: 'border-2 border-[#1daddd] shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] rounded-lg'
                        }}
                    />

                    {isProcessing && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white z-20 gap-2">
                            <div className="size-8 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                            <span className="text-xs font-semibold">Applying Crop...</span>
                        </div>
                    )}
                </div>

                {/* Controls & Predefined Sizes */}
                <div className="p-4 space-y-4 overflow-y-auto no-scrollbar">
                    {/* Predefined Aspect Ratio Buttons */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider block">
                            Predefined Crop Sizes
                        </label>
                        <div className="grid grid-cols-5 gap-1.5">
                            {PREDEFINED_ASPECT_RATIOS.map((ratio) => {
                                const isSelected = (aspect === ratio.value) || (aspect === undefined && ratio.value === undefined);
                                return (
                                    <button
                                        key={ratio.label}
                                        type="button"
                                        onClick={() => setAspect(ratio.value)}
                                        className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl font-bold text-xs transition-all border ${
                                            isSelected
                                                ? 'bg-[#1daddd] text-white border-[#1daddd] shadow-sm shadow-[#1daddd]/30'
                                                : 'bg-gray-50 dark:bg-[#28282C] text-gray-700 dark:text-gray-300 border-gray-200/80 dark:border-gray-700/60 hover:bg-gray-100 dark:hover:bg-[#323238]'
                                        }`}
                                    >
                                        <span className="text-xs font-extrabold">{ratio.label}</span>
                                        <span className={`text-[9px] font-medium tracking-tight mt-0.5 ${isSelected ? 'text-white/90' : 'text-gray-400 dark:text-gray-400'}`}>
                                            {ratio.badge}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Zoom & Rotation Controls */}
                    <div className="flex items-center gap-2 pt-1">
                        {/* Zoom Slider */}
                        <div className="flex-1 flex items-center gap-2 bg-gray-50 dark:bg-[#28282C] px-3 py-2 rounded-xl border border-gray-200/80 dark:border-gray-700/60">
                            <button
                                type="button"
                                onClick={() => setZoom((z) => Math.max(1, z - 0.2))}
                                className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
                            >
                                <DynamicLucideIcon name="zoom_out" className="text-base" />
                            </button>
                            <input
                                type="range"
                                min={1}
                                max={3}
                                step={0.05}
                                value={zoom}
                                onChange={(e) => setZoom(parseFloat(e.target.value))}
                                className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#1daddd]"
                            />
                            <button
                                type="button"
                                onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
                                className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
                            >
                                <DynamicLucideIcon name="zoom_in" className="text-base" />
                            </button>
                        </div>

                        {/* Rotate button */}
                        <button
                            type="button"
                            onClick={handleRotate}
                            title="Rotate 90°"
                            className="p-2.5 bg-gray-50 dark:bg-[#28282C] text-gray-700 dark:text-gray-300 hover:text-[#1daddd] dark:hover:text-[#1daddd] rounded-xl border border-gray-200/80 dark:border-gray-700/60 hover:bg-gray-100 dark:hover:bg-[#323238] transition-all flex items-center gap-1 text-xs font-semibold"
                        >
                            <DynamicLucideIcon name="flip_camera_ios" className="text-base" />
                            <span className="hidden sm:inline">Rotate</span>
                        </button>

                        {/* Reset button */}
                        <button
                            type="button"
                            onClick={handleReset}
                            title="Reset adjustments"
                            className="p-2.5 bg-gray-50 dark:bg-[#28282C] text-gray-700 dark:text-gray-300 hover:text-red-500 rounded-xl border border-gray-200/80 dark:border-gray-700/60 hover:bg-gray-100 dark:hover:bg-[#323238] transition-all flex items-center gap-1 text-xs font-semibold"
                        >
                            <DynamicLucideIcon name="refresh" className="text-base" />
                            <span className="hidden sm:inline">Reset</span>
                        </button>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-[#1A1A1D] flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={() => handleApply(true)}
                        disabled={isProcessing}
                        className="px-3 sm:px-4 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-semibold text-xs rounded-xl hover:bg-gray-100 dark:hover:bg-[#28282C] transition-colors"
                    >
                        Skip Cropping
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={isProcessing}
                            className="px-3 sm:px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold text-xs rounded-xl hover:bg-gray-100 dark:hover:bg-[#28282C] transition-colors"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            onClick={() => handleApply(false)}
                            disabled={isProcessing}
                            className="px-5 sm:px-6 py-3 bg-[#1daddd] hover:bg-[#199ecb] active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-lg shadow-[#1daddd]/25 transition-all flex items-center gap-2"
                        >
                            <DynamicLucideIcon name="check" className="text-base" />
                            {isLastImage ? 'Apply Crop' : 'Next Photo'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
