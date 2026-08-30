'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { getCroppedImg } from '@/utils/imageUtils';

export const PREDEFINED_ASPECT_RATIOS = [
    {
        id: '4-3',
        label: '4:3',
        value: 4 / 3,
        name: 'Listing Card',
        badge: 'Recommended',
        boxClass: 'w-5 h-3.5', // visual aspect icon
    },
    {
        id: '1-1',
        label: '1:1',
        value: 1 / 1,
        name: 'Square',
        badge: '1:1 Ratio',
        boxClass: 'w-4 h-4',
    },
    {
        id: '3-4',
        label: '3:4',
        value: 3 / 4,
        name: 'Portrait',
        badge: 'Vertical',
        boxClass: 'w-3.5 h-5',
    },
    {
        id: '16-9',
        label: '16:9',
        value: 16 / 9,
        name: 'Widescreen',
        badge: 'Landscape',
        boxClass: 'w-6 h-3',
    },
    {
        id: 'free',
        label: 'Free',
        value: undefined,
        name: 'Custom',
        badge: 'Freeform',
        boxClass: 'w-4 h-4 border-dashed',
    },
];

/**
 * ImageCropModal - Rethought & Redesigned Photo Studio
 * 
 * Features:
 * - Multi-photo filmstrip carousel with thumbnail switching
 * - Visual predefined aspect ratio selector (4:3, 1:1, 3:4, 16:9, Free)
 * - Fine-tune adjustment tools (Zoom slider, 90° rotation, horizontal flip)
 * - State persistence across photo switching
 * - High-res canvas export
 */
export default function ImageCropModal({
    isOpen,
    images = [],
    initialIndex = 0,
    onCropDone,
    onCancel,
}) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [activeTab, setActiveTab] = useState('ratio'); // 'ratio' | 'adjust'
    const [itemsState, setItemsState] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);

    // Initialize items state when modal opens
    useEffect(() => {
        if (isOpen && images && images.length > 0) {
            const initialStates = images.map((item, idx) => {
                const src = item?.src || item?.originalSrc || item?.dataUrl || (typeof item === 'string' ? item : '');
                return {
                    id: idx,
                    src,
                    originalSrc: item?.originalSrc || src,
                    file: item?.rawFile || item?.file || null,
                    rawFile: item?.rawFile || item?.file || null,
                    crop: { x: 0, y: 0 },
                    zoom: 1,
                    rotation: 0,
                    flip: { horizontal: false, vertical: false },
                    aspect: 4 / 3,
                    croppedAreaPixels: null,
                    isCropped: false,
                };
            });

            setItemsState(initialStates);
            const validIdx = Math.min(Math.max(0, initialIndex), images.length - 1);
            setActiveIndex(validIdx);
            setActiveTab('ratio');
            setIsProcessing(false);
        }
    }, [isOpen, images, initialIndex]);

    const currentItem = itemsState[activeIndex] || null;
    const totalCount = itemsState.length;
    const isSingleImage = totalCount <= 1;

    // Handlers for current active photo
    const updateActiveItem = useCallback((updates) => {
        setItemsState((prev) => {
            const next = [...prev];
            if (next[activeIndex]) {
                next[activeIndex] = { ...next[activeIndex], ...updates };
            }
            return next;
        });
    }, [activeIndex]);

    const onCropChange = useCallback((crop) => {
        updateActiveItem({ crop });
    }, [updateActiveItem]);

    const onZoomChange = useCallback((zoom) => {
        updateActiveItem({ zoom });
    }, [updateActiveItem]);

    const onCropCompleteCallback = useCallback((_, croppedAreaPixels) => {
        updateActiveItem({ croppedAreaPixels, isCropped: true });
    }, [updateActiveItem]);

    const handleRotate90 = () => {
        if (!currentItem) return;
        const nextRotation = (currentItem.rotation + 90) % 360;
        updateActiveItem({ rotation: nextRotation });
    };

    const handleToggleFlip = () => {
        if (!currentItem) return;
        updateActiveItem({
            flip: {
                ...currentItem.flip,
                horizontal: !currentItem.flip?.horizontal,
            }
        });
    };

    const handleResetCurrent = () => {
        updateActiveItem({
            crop: { x: 0, y: 0 },
            zoom: 1,
            rotation: 0,
            flip: { horizontal: false, vertical: false },
            aspect: 4 / 3,
        });
    };

    const handleSelectRatio = (ratioValue) => {
        updateActiveItem({ aspect: ratioValue });
    };

    // Process a single item crop to dataUrl
    const cropSingleItem = async (item, skipCrop = false) => {
        if (!item || !item.src) return null;

        if (skipCrop || !item.croppedAreaPixels) {
            return {
                originalSrc: item.originalSrc || item.src,
                dataUrl: typeof item.src === 'string' && item.src.startsWith('data:') ? item.src : null,
                previewUrl: item.src,
                file: item.rawFile || item.file || null,
                isCropped: false,
            };
        }

        try {
            const cropped = await getCroppedImg(
                item.src,
                item.croppedAreaPixels,
                item.rotation || 0,
                item.flip || { horizontal: false, vertical: false }
            );

            if (!cropped) {
                throw new Error('Crop processing failed');
            }

            return {
                originalSrc: item.originalSrc || item.src,
                dataUrl: cropped.dataUrl,
                blob: cropped.blob,
                previewUrl: cropped.dataUrl,
                file: cropped.blob,
                isCropped: true,
                aspectRatio: item.aspect,
            };
        } catch (err) {
            console.error('[ImageCropModal] Cropping failed for item:', err);
            return {
                originalSrc: item.originalSrc || item.src,
                dataUrl: typeof item.src === 'string' && item.src.startsWith('data:') ? item.src : null,
                previewUrl: item.src,
                file: item.rawFile || item.file || null,
                isCropped: false,
            };
        }
    };

    // Apply all edits and return array
    const handleApplyAll = async (skipAll = false) => {
        if (isProcessing || !itemsState.length) return;
        setIsProcessing(true);

        try {
            const results = await Promise.all(
                itemsState.map((item) => cropSingleItem(item, skipAll))
            );

            if (onCropDone) {
                onCropDone(results.filter(Boolean));
            }
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen || !currentItem || !currentItem.src) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in select-none">
            {/* Main Studio Frame */}
            <div className="bg-[#121215] text-white w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white/10 relative">
                
                {/* 1. Header Bar */}
                <header className="px-4 py-3 bg-[#18181D] border-b border-white/10 flex items-center justify-between z-10 shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={isProcessing}
                            className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
                            aria-label="Cancel"
                        >
                            <DynamicLucideIcon name="close" className="text-xl" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm font-extrabold tracking-tight text-white flex items-center gap-1.5">
                                    <DynamicLucideIcon name="crop" className="text-sm text-[#1daddd]" />
                                    Photo Studio
                                </h2>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#1daddd]/20 text-[#1daddd] border border-[#1daddd]/30 uppercase tracking-wider">
                                    {activeIndex === 0 ? 'Main Photo' : `Photo ${activeIndex + 1}`}
                                </span>
                            </div>
                            <p className="text-[11px] text-gray-400 font-medium">
                                Choose a frame size or adjust crop & angle
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={handleResetCurrent}
                            title="Reset adjustments"
                            className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors border border-white/10"
                        >
                            <DynamicLucideIcon name="refresh" className="text-sm" />
                            <span className="hidden sm:inline">Reset</span>
                        </button>
                    </div>
                </header>

                {/* 2. Filmstrip (Multi-Photo Carousel) */}
                {!isSingleImage && (
                    <div className="px-4 py-2 bg-[#151518] border-b border-white/5 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-1">
                            Photos ({totalCount}):
                        </span>
                        {itemsState.map((item, idx) => {
                            const isActive = idx === activeIndex;
                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setActiveIndex(idx)}
                                    className={`relative size-11 rounded-xl overflow-hidden shrink-0 transition-all border-2 ${
                                        isActive
                                            ? 'border-[#1daddd] shadow-md shadow-[#1daddd]/30 scale-105 ring-2 ring-[#1daddd]/40'
                                            : 'border-white/15 opacity-60 hover:opacity-100'
                                    }`}
                                >
                                    <img src={item.src} className="w-full h-full object-cover" alt={`Thumb ${idx + 1}`} />
                                    <span className={`absolute bottom-0 inset-x-0 text-[8px] font-black text-center text-white py-0.2 ${
                                        isActive ? 'bg-[#1daddd]' : 'bg-black/70'
                                    }`}>
                                        {idx === 0 ? 'MAIN' : `#${idx + 1}`}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* 3. Immersive Viewport & Cropper */}
                <div className="relative flex-1 min-h-[260px] sm:min-h-[320px] bg-[#0A0A0C] overflow-hidden flex items-center justify-center">
                    <Cropper
                        key={`crop-${activeIndex}-${currentItem.src}`}
                        image={currentItem.src}
                        crop={currentItem.crop}
                        zoom={currentItem.zoom}
                        rotation={currentItem.rotation}
                        aspect={currentItem.aspect}
                        transform={[
                            `translate(${currentItem.crop.x}px, ${currentItem.crop.y}px)`,
                            `scale(${currentItem.zoom})`,
                            `rotate(${currentItem.rotation}deg)`,
                            `scaleX(${currentItem.flip?.horizontal ? -1 : 1})`,
                        ].join(' ')}
                        onCropChange={onCropChange}
                        onZoomChange={onZoomChange}
                        onCropComplete={onCropCompleteCallback}
                        showGrid={true}
                        cropShape="rect"
                        classes={{
                            containerClassName: 'w-full h-full',
                            cropAreaClassName: 'border-2 border-[#1daddd] shadow-[0_0_0_9999px_rgba(0,0,0,0.75)] rounded-xl'
                        }}
                    />

                    {/* Quick Canvas Overlay Badges */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20 pointer-events-none">
                        {currentItem.rotation !== 0 && (
                            <span className="px-2 py-1 bg-black/70 backdrop-blur-md rounded-lg text-[10px] font-bold text-white/90 border border-white/10">
                                {currentItem.rotation}°
                            </span>
                        )}
                        {currentItem.flip?.horizontal && (
                            <span className="px-2 py-1 bg-black/70 backdrop-blur-md rounded-lg text-[10px] font-bold text-[#1daddd] border border-[#1daddd]/30">
                                Flipped
                            </span>
                        )}
                    </div>

                    {/* Processing overlay spinner */}
                    {isProcessing && (
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-white z-30 gap-3 animate-fade-in">
                            <div className="size-10 border-3 border-[#1daddd]/20 border-t-[#1daddd] rounded-full animate-spin" />
                            <p className="text-xs font-bold tracking-wide">Processing High-Quality Crops...</p>
                        </div>
                    )}
                </div>

                {/* 4. Controls Deck */}
                <div className="bg-[#18181D] border-t border-white/10 shrink-0">
                    {/* Mode Switch Tabs */}
                    <div className="flex border-b border-white/5">
                        <button
                            type="button"
                            onClick={() => setActiveTab('ratio')}
                            className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                                activeTab === 'ratio'
                                    ? 'text-[#1daddd] border-b-2 border-[#1daddd] bg-[#1daddd]/5'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            <DynamicLucideIcon name="crop" className="text-sm" />
                            Predefined Sizes
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('adjust')}
                            className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                                activeTab === 'adjust'
                                    ? 'text-[#1daddd] border-b-2 border-[#1daddd] bg-[#1daddd]/5'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            <DynamicLucideIcon name="tune" className="text-sm" />
                            Zoom & Angle
                        </button>
                    </div>

                    {/* Tab Panels */}
                    <div className="p-4">
                        {activeTab === 'ratio' ? (
                            /* Predefined Aspect Ratio Cards */
                            <div className="grid grid-cols-5 gap-2">
                                {PREDEFINED_ASPECT_RATIOS.map((r) => {
                                    const isSelected =
                                        currentItem.aspect === r.value ||
                                        (currentItem.aspect === undefined && r.value === undefined);
                                    return (
                                        <button
                                            key={r.id}
                                            type="button"
                                            onClick={() => handleSelectRatio(r.value)}
                                            className={`flex flex-col items-center justify-center py-2.5 px-1.5 rounded-2xl transition-all border ${
                                                isSelected
                                                    ? 'bg-[#1daddd] text-white border-[#1daddd] shadow-lg shadow-[#1daddd]/25 scale-[1.02]'
                                                    : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:text-white'
                                            }`}
                                        >
                                            {/* Visual Ratio Box */}
                                            <div className="h-6 flex items-center justify-center mb-1">
                                                <div
                                                    className={`${r.boxClass} rounded-xs border-2 ${
                                                        isSelected ? 'border-white bg-white/20' : 'border-gray-400'
                                                    }`}
                                                />
                                            </div>
                                            <span className="text-xs font-black tracking-tight">{r.label}</span>
                                            <span className={`text-[9px] font-medium tracking-tight truncate max-w-full ${
                                                isSelected ? 'text-white/90' : 'text-gray-400'
                                            }`}>
                                                {r.name}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            /* Adjustments (Zoom, Rotate, Flip) */
                            <div className="space-y-3">
                                {/* Zoom Slider */}
                                <div className="flex items-center gap-3 bg-white/5 p-2.5 rounded-2xl border border-white/10">
                                    <button
                                        type="button"
                                        onClick={() => onZoomChange(Math.max(1, currentItem.zoom - 0.2))}
                                        className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                                        title="Zoom Out"
                                    >
                                        <DynamicLucideIcon name="zoom_out" className="text-base" />
                                    </button>

                                    <div className="flex-1 flex items-center gap-2">
                                        <input
                                            type="range"
                                            min={1}
                                            max={3}
                                            step={0.05}
                                            value={currentItem.zoom}
                                            onChange={(e) => onZoomChange(parseFloat(e.target.value))}
                                            className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#1daddd]"
                                        />
                                        <span className="text-[11px] font-mono font-bold text-gray-300 w-10 text-right">
                                            {Math.round(currentItem.zoom * 100)}%
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => onZoomChange(Math.min(3, currentItem.zoom + 0.2))}
                                        className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                                        title="Zoom In"
                                    >
                                        <DynamicLucideIcon name="zoom_in" className="text-base" />
                                    </button>
                                </div>

                                {/* Angle & Flip Actions */}
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={handleRotate90}
                                        className="py-2.5 px-3 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white border border-white/10 text-xs font-bold flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
                                    >
                                        <DynamicLucideIcon name="flip_camera_ios" className="text-base text-[#1daddd]" />
                                        <span>Rotate 90° ({currentItem.rotation}°)</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleToggleFlip}
                                        className={`py-2.5 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-colors active:scale-[0.98] ${
                                            currentItem.flip?.horizontal
                                                ? 'bg-[#1daddd]/20 text-[#1daddd] border-[#1daddd]/50'
                                                : 'bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white border-white/10'
                                        }`}
                                    >
                                        <DynamicLucideIcon name="flip" className="text-base text-[#1daddd]" />
                                        <span>Flip Horizontal</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 5. Footer Action Dock */}
                <footer className="p-4 bg-[#141417] border-t border-white/10 flex items-center justify-between gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={() => handleApplyAll(true)}
                        disabled={isProcessing}
                        className="px-3 sm:px-4 py-3 rounded-2xl text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        Skip & Keep Original
                    </button>

                    <div className="flex items-center gap-2">
                        {!isSingleImage && (
                            <div className="flex items-center bg-white/5 rounded-2xl border border-white/10 p-1">
                                <button
                                    type="button"
                                    disabled={activeIndex === 0 || isProcessing}
                                    onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                                    className="p-2 text-gray-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none rounded-xl hover:bg-white/10 transition-colors"
                                    title="Previous Photo"
                                >
                                    <DynamicLucideIcon name="chevron_left" className="text-base" />
                                </button>
                                <span className="px-2 text-xs font-bold text-gray-300">
                                    {activeIndex + 1}/{totalCount}
                                </span>
                                <button
                                    type="button"
                                    disabled={activeIndex >= totalCount - 1 || isProcessing}
                                    onClick={() => setActiveIndex((i) => Math.min(totalCount - 1, i + 1))}
                                    className="p-2 text-gray-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none rounded-xl hover:bg-white/10 transition-colors"
                                    title="Next Photo"
                                >
                                    <DynamicLucideIcon name="chevron_right" className="text-base" />
                                </button>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={() => handleApplyAll(false)}
                            disabled={isProcessing}
                            className="px-5 sm:px-6 py-3 rounded-2xl bg-[#1daddd] hover:bg-[#199ecb] active:scale-[0.98] text-white font-bold text-xs shadow-lg shadow-[#1daddd]/25 transition-all flex items-center gap-2"
                        >
                            <DynamicLucideIcon name="check" className="text-base" />
                            {isSingleImage ? 'Apply Crop' : `Done (${totalCount} Photos)`}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
}
