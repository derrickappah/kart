'use client';

import React from 'react';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';

/**
 * Modal / Action sheet providing options to either take a photo with the in-app camera or choose from gallery/files.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {Function} props.onClose - Function to close modal
 * @param {Function} props.onOpenInAppCamera - Function to trigger in-app live camera screen
 * @param {Function} props.onFilesSelected - Callback with (files: File[], replaceIndex: number | null)
 * @param {number|null} props.replaceIndex - Index if replacing an existing photo
 * @param {number} props.remainingSlots - How many photo slots remain
 */
export default function PhotoSourceModal({
    isOpen,
    onClose,
    onOpenInAppCamera,
    onFilesSelected,
    replaceIndex = null,
    remainingSlots = 5,
}) {
    if (!isOpen) return null;

    const isReplacing = replaceIndex !== null;
    const inputId = `gallery-picker-input-${isReplacing ? replaceIndex : 'new'}`;

    const handleCameraClick = () => {
        onClose();
        if (onOpenInAppCamera) {
            onOpenInAppCamera(replaceIndex);
        }
    };

    const handleGalleryChange = (e) => {
        const fileList = e.target.files;
        if (fileList && fileList.length > 0) {
            const files = Array.from(fileList);
            onFilesSelected(files, replaceIndex);
            onClose();
        }
        e.target.value = '';
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
            onClick={onClose}
        >
            {/* Modal Body */}
            <div
                className="bg-white dark:bg-[#1E2428] w-full max-w-[420px] rounded-t-[28px] sm:rounded-[28px] p-6 shadow-2xl border border-gray-100 dark:border-white/10 flex flex-col gap-4 animate-in slide-in-from-bottom duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-white/5">
                    <div>
                        <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
                            {isReplacing ? 'Replace Photo' : 'Add Photo'}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                            {isReplacing
                                ? 'Choose how you want to update this image'
                                : `Select an option (${remainingSlots} photo slot${remainingSlots === 1 ? '' : 's'} available)`}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="size-8 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                        aria-label="Close"
                    >
                        <DynamicLucideIcon name="close" className="text-lg" />
                    </button>
                </div>

                {/* Option Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Option 1: In-App Live Camera */}
                    <button
                        type="button"
                        onClick={handleCameraClick}
                        className="flex flex-row sm:flex-col items-center gap-3.5 p-4 rounded-2xl bg-gray-50 dark:bg-white/5 hover:bg-[#1daddd]/10 dark:hover:bg-[#1daddd]/15 border-2 border-transparent hover:border-[#1daddd] text-left sm:text-center transition-all group active:scale-[0.98] cursor-pointer"
                    >
                        <div className="size-12 rounded-xl bg-[#1daddd]/10 dark:bg-[#1daddd]/20 text-[#1daddd] flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                            <DynamicLucideIcon name="camera" className="text-2xl" />
                        </div>
                        <div className="flex-1">
                            <span className="block font-bold text-sm text-gray-900 dark:text-white group-hover:text-[#1daddd] transition-colors">
                                Take Photo
                            </span>
                            <span className="block text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                Live in-app camera
                            </span>
                        </div>
                    </button>

                    {/* Option 2: Choose from Library / Gallery (Native HTML Label binding) */}
                    <label
                        htmlFor={inputId}
                        className="flex flex-row sm:flex-col items-center gap-3.5 p-4 rounded-2xl bg-gray-50 dark:bg-white/5 hover:bg-purple-500/10 dark:hover:bg-purple-500/15 border-2 border-transparent hover:border-purple-500 text-left sm:text-center transition-all group active:scale-[0.98] cursor-pointer"
                    >
                        <input
                            id={inputId}
                            type="file"
                            accept="image/*"
                            multiple={!isReplacing}
                            onChange={handleGalleryChange}
                            className="sr-only"
                        />
                        <div className="size-12 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                            <DynamicLucideIcon name="image" className="text-2xl" />
                        </div>
                        <div className="flex-1">
                            <span className="block font-bold text-sm text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                Photo Library
                            </span>
                            <span className="block text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                Upload from gallery
                            </span>
                        </div>
                    </label>
                </div>

                {/* Cancel Button */}
                <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-3.5 mt-1 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}
