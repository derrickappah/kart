'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { validateImage, compressProductImage, convertHeicToJpeg } from '@/utils/imageUtils';
import { updateListingAction } from './actions';
import CategorySelector from '@/components/CategorySelector';
import ImageCropModal from '@/components/ImageCropModal';
import PhotoSourceModal from '@/components/PhotoSourceModal';
import InAppCameraModal from '@/components/InAppCameraModal';

export default function EditListingClient({ product }) {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    const [error, setError] = useState(null);

    // Initial photos from product (supports both images array and legacy image_url)
    const initialPhotos = product?.images?.length
        ? product.images
        : (product?.image_url ? [product.image_url] : []);

    const [imageFiles, setImageFiles] = useState(() => {
        return initialPhotos.map((url) => ({
            type: 'remote',
            url: url,
            originalSrc: url,
            previewUrl: url,
        }));
    });

    const [imagePreviews, setImagePreviews] = useState(() => {
        return [...initialPhotos];
    });

    const [sourceModal, setSourceModal] = useState({
        isOpen: false,
        replaceIndex: null,
    });
    const [cameraModal, setCameraModal] = useState({
        isOpen: false,
        replaceIndex: null,
    });
    const [cropModal, setCropModal] = useState({
        isOpen: false,
        images: [],
        replaceIndex: null,
    });

    const [touched, setTouched] = useState({
        title: false,
        price: false,
        category: false,
        description: false,
        photos: false,
    });

    const markTouched = (field) => {
        setTouched((prev) => ({ ...prev, [field]: true }));
    };

    const isSubmittingRef = useRef(false);
    const previewsRef = useRef(imagePreviews);

    const [formData, setFormData] = useState({
        title: product?.title || '',
        price: product?.price !== undefined && product?.price !== null ? String(product.price) : '',
        category: product?.category || '',
        condition: product?.condition || 'New',
        description: product?.description || '',
        campus: product?.campus || '',
    });

    const [campuses, setCampuses] = useState([]);
    const [campusSearch, setCampusSearch] = useState(product?.campus || '');
    const [showCampusDropdown, setShowCampusDropdown] = useState(false);

    // Fetch official campuses from database
    useEffect(() => {
        const fetchCampuses = async () => {
            try {
                const { data, error } = await supabase
                    .from('campus_locations')
                    .select('*')
                    .order('name', { ascending: true });
                if (!error && data) {
                    setCampuses(data);
                }
            } catch (err) {
                console.error('Error fetching campuses:', err);
            }
        };
        fetchCampuses();
    }, [supabase]);

    // Sync previews ref
    useEffect(() => {
        previewsRef.current = imagePreviews;
    }, [imagePreviews]);

    // Warn before unloading if changes are made
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isSubmittingRef.current) return;
            const isDirty =
                formData.title !== (product?.title || '') ||
                formData.price !== (product?.price !== undefined && product?.price !== null ? String(product.price) : '') ||
                formData.category !== (product?.category || '') ||
                formData.condition !== (product?.condition || 'New') ||
                formData.description !== (product?.description || '') ||
                formData.campus !== (product?.campus || '') ||
                imagePreviews.length !== initialPhotos.length ||
                imageFiles.some((f) => f.type === 'local');

            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [formData, imageFiles, imagePreviews, initialPhotos, product]);

    const handleBackConfirm = () => {
        if (isSubmittingRef.current) return;
        const isDirty =
            formData.title !== (product?.title || '') ||
            formData.price !== (product?.price !== undefined && product?.price !== null ? String(product.price) : '') ||
            formData.category !== (product?.category || '') ||
            formData.condition !== (product?.condition || 'New') ||
            formData.description !== (product?.description || '') ||
            formData.campus !== (product?.campus || '') ||
            imagePreviews.length !== initialPhotos.length ||
            imageFiles.some((f) => f.type === 'local');

        if (isDirty) {
            if (confirm('Are you sure you want to discard your changes?')) {
                router.back();
            }
        } else {
            router.back();
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleConditionChange = (condition) => {
        setFormData({ ...formData, condition });
    };

    // Process selected files from camera or gallery
    const handleFilesSelected = async (files, replaceIndex = null) => {
        if (!files || files.length === 0) return;

        // Validate each file
        for (const file of files) {
            const validation = validateImage(file);
            if (!validation.valid) {
                setError(validation.error);
                return;
            }
        }

        try {
            if (replaceIndex !== null) {
                // Replacing a specific image
                const file = files[0];
                const convertedFile = await convertHeicToJpeg(file);
                const processed = await compressProductImage(convertedFile);
                const originalUrl = URL.createObjectURL(convertedFile);
                const previewUrl = processed.dataUrl || originalUrl;

                if (imagePreviews[replaceIndex]?.startsWith('blob:')) {
                    URL.revokeObjectURL(imagePreviews[replaceIndex]);
                }

                const newFiles = [...imageFiles];
                newFiles[replaceIndex] = {
                    type: 'local',
                    file: convertedFile,
                    dataUrl: processed.dataUrl,
                    originalSrc: originalUrl,
                    previewUrl: previewUrl,
                };

                const newPreviews = [...imagePreviews];
                newPreviews[replaceIndex] = previewUrl;

                setImageFiles(newFiles);
                setImagePreviews(newPreviews);
            } else {
                // Adding new images directly to preview
                const remainingSlots = 5 - imageFiles.length;
                if (files.length > remainingSlots) {
                    setError(`You can only add up to 5 photos. ${remainingSlots} slot(s) remaining.`);
                    return;
                }

                const processedList = await Promise.all(
                    files.map(async (file) => {
                        const convertedFile = await convertHeicToJpeg(file);
                        const originalUrl = URL.createObjectURL(convertedFile);
                        const res = await compressProductImage(convertedFile);
                        return {
                            type: 'local',
                            file: convertedFile,
                            dataUrl: res.dataUrl,
                            previewUrl: res.dataUrl || originalUrl,
                            originalSrc: originalUrl,
                        };
                    })
                );

                const nextFiles = [...imageFiles, ...processedList];
                const nextPreviews = [...imagePreviews, ...processedList.map((p) => p.previewUrl)];

                setImageFiles(nextFiles);
                setImagePreviews(nextPreviews);
            }
        } catch (err) {
            console.error('[EditListing] Photo selection processing error:', err);
            setError('Failed to process selected photos. Please try again.');
        }
    };

    // Open crop modal to re-crop an existing uploaded thumbnail
    const openReCrop = (index) => {
        const item = imageFiles[index];
        if (!item) return;

        const src = item.originalSrc || item.dataUrl || item.url || imagePreviews[index];
        setCropModal({
            isOpen: true,
            images: [
                {
                    src,
                    originalSrc: item.originalSrc || item.url || src,
                    file: item.file || null,
                    rawFile: item.file || null,
                },
            ],
            replaceIndex: index,
        });
    };

    // Callback when cropping is completed in ImageCropModal
    const handleCropDone = async (results) => {
        const replaceIdx = cropModal.replaceIndex;
        setCropModal({ isOpen: false, images: [], replaceIndex: null });

        try {
            if (replaceIdx !== null) {
                // Replacing / re-cropping an image at a specific index
                const item = results[0];
                if (!item) return;

                const processed = await compressProductImage(item.dataUrl || item.file || item.originalSrc);
                const previewUrl = processed.dataUrl || item.previewUrl || item.originalSrc;

                if (imagePreviews[replaceIdx]?.startsWith('blob:')) {
                    URL.revokeObjectURL(imagePreviews[replaceIdx]);
                }

                const newFiles = [...imageFiles];
                newFiles[replaceIdx] = {
                    type: 'local',
                    file: item.file || item.blob || item.rawFile,
                    dataUrl: processed.dataUrl || item.dataUrl,
                    originalSrc: item.originalSrc,
                    previewUrl: previewUrl,
                };

                const newPreviews = [...imagePreviews];
                newPreviews[replaceIdx] = previewUrl;

                setImageFiles(newFiles);
                setImagePreviews(newPreviews);
            } else {
                // Adding newly selected cropped images
                const processedList = await Promise.all(
                    results.map(async (item) => {
                        const res = await compressProductImage(item.dataUrl || item.file || item.originalSrc);
                        return {
                            type: 'local',
                            file: item.file || item.blob || item.rawFile,
                            dataUrl: res.dataUrl || item.dataUrl,
                            previewUrl: res.dataUrl || item.previewUrl || item.originalSrc,
                            originalSrc: item.originalSrc,
                        };
                    })
                );

                setImageFiles((prev) => [...prev, ...processedList]);
                setImagePreviews((prev) => [...prev, ...processedList.map((p) => p.previewUrl)]);
            }
        } catch (err) {
            console.error('[EditListing] Error processing cropped images:', err);
            setError('Failed to process cropped photos. Please try again.');
        }
    };

    const removeImage = (index) => {
        if (imagePreviews[index] && imagePreviews[index].startsWith('blob:')) {
            URL.revokeObjectURL(imagePreviews[index]);
        }

        const newFiles = imageFiles.filter((_, i) => i !== index);
        const newPreviews = imagePreviews.filter((_, i) => i !== index);

        setImageFiles(newFiles);
        setImagePreviews(newPreviews);
    };

    // Clean up previews ONLY on unmount to prevent memory leaks
    useEffect(() => {
        return () => {
            previewsRef.current.forEach((url) => {
                if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
            });
        };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Mark all fields as touched immediately
        setTouched({
            title: true,
            price: true,
            category: true,
            description: true,
            photos: true,
        });

        setLoading(true);
        setUploadProgress('');
        setError(null);
        isSubmittingRef.current = true;

        try {
            // Client-side input validations
            const titleTrimmed = formData.title.trim();
            const descriptionTrimmed = formData.description.trim();
            const campusTrimmed = formData.campus.trim();

            if (titleTrimmed.length < 3) {
                throw new Error('Title must be at least 3 characters long');
            }
            if (descriptionTrimmed.length < 10) {
                throw new Error('Description must be at least 10 characters long');
            }

            const priceNum = parseFloat(formData.price);
            if (isNaN(priceNum) || priceNum < 0) {
                throw new Error('Price must be a non-negative number');
            }
            if (priceNum > 1000000) {
                throw new Error('Price cannot exceed ₵1,000,000');
            }

            if (!formData.category) {
                throw new Error('Please select a category');
            }

            if (imageFiles.length === 0) {
                throw new Error('Please include at least one photo for your listing.');
            }

            // Step 1: Collect photos payload
            const photosPayload = [];
            for (let i = 0; i < imageFiles.length; i++) {
                const item = imageFiles[i];
                if (item.type === 'remote' && (item.url || item.originalSrc)) {
                    photosPayload.push({ type: 'remote', url: item.url || item.originalSrc });
                } else if (item.dataUrl) {
                    photosPayload.push({ type: 'local', dataUrl: item.dataUrl });
                } else if (item.file) {
                    setUploadProgress(`Processing photo ${i + 1} of ${imageFiles.length}...`);
                    const processed = await compressProductImage(item.file);
                    if (processed.dataUrl) {
                        photosPayload.push({ type: 'local', dataUrl: processed.dataUrl });
                    }
                } else if (item.url) {
                    photosPayload.push({ type: 'remote', url: item.url });
                }
            }

            if (imageFiles.length > 0 && photosPayload.length === 0) {
                throw new Error('Could not process selected photos. Please re-select your photos and try again.');
            }

            setUploadProgress('Saving changes...');

            // Step 2: Call Server Action to handle update
            const result = await updateListingAction(product.id, {
                title: titleTrimmed,
                price: priceNum,
                category: formData.category,
                condition: formData.condition,
                description: descriptionTrimmed,
                campus: campusTrimmed || null,
                photos: photosPayload,
            });

            if (!result.success) {
                throw new Error(result.error || 'Failed to update listing');
            }

            router.push('/dashboard/seller/listings');
            router.refresh();
            return;
        } catch (err) {
            console.error('[EditListing] Submit error:', err);
            setError(err.message || 'Failed to update listing. Please try again.');
            isSubmittingRef.current = false;
            setLoading(false);
            setUploadProgress('');
        }
    };

    return (
        <main className="bg-white dark:bg-[#242428] font-display text-gray-900 dark:text-white min-h-screen flex flex-col pt-4">
            {/* Main Content Area */}
            <form onSubmit={handleSubmit} className="flex-1 pb-36 relative max-w-[430px] mx-auto w-full">
                {/* Header with Back Button */}
                <div className="px-4 mb-2 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={handleBackConfirm}
                        disabled={loading}
                        className="size-10 rounded-full flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                        title="Go back"
                        aria-label="Go back"
                    >
                        <DynamicLucideIcon name="arrow_back" className="text-2xl" />
                    </button>
                    <h1 className="text-lg font-extrabold text-gray-900 dark:text-white flex-1 text-center pr-10">
                        Edit Listing
                    </h1>
                </div>

                {error && (
                    <div className="mx-4 mt-2 mb-4 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium">
                        {error}
                    </div>
                )}

                {/* Photo Upload Section */}
                <section className="p-4">
                    <div className="grid grid-cols-2 gap-3">
                        {imagePreviews.map((url, index) => (
                            <div
                                key={url + index}
                                className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm animate-fade-in group bg-white dark:bg-gray-800"
                            >
                                <img
                                    src={url}
                                    className="w-full h-full object-cover bg-white dark:bg-gray-800"
                                    alt={`Preview ${index + 1}`}
                                    onError={(e) => {
                                        const orig = imageFiles[index]?.originalSrc;
                                        if (orig && e.currentTarget.src !== orig) {
                                            e.currentTarget.src = orig;
                                        }
                                    }}
                                />

                                {/* Top-right remove button */}
                                <button
                                    type="button"
                                    disabled={loading}
                                    onClick={() => removeImage(index)}
                                    className="absolute top-2 right-2 bg-red-500/90 hover:bg-red-600 text-white rounded-full p-1.5 shadow-md transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transform translate-y-0 sm:translate-y-1 sm:group-hover:translate-y-0 disabled:opacity-50"
                                    title="Remove photo"
                                    aria-label="Remove photo"
                                >
                                    <DynamicLucideIcon name="close" className="text-[14px]" />
                                </button>

                                {/* Bottom-right actions: Crop & Replace */}
                                <div className="absolute bottom-2 right-2 flex items-center gap-1.5 opacity-100 transition-all">
                                    <button
                                        type="button"
                                        disabled={loading}
                                        onClick={() => openReCrop(index)}
                                        className="bg-black/60 hover:bg-primary text-white backdrop-blur-md rounded-lg px-2 py-1 text-[10px] font-bold shadow-md transition-all flex items-center gap-1 border border-white/20 active:scale-95 disabled:opacity-50"
                                        title="Crop photo"
                                        aria-label="Crop photo"
                                    >
                                        <DynamicLucideIcon name="crop" className="text-[12px]" />
                                        <span>Crop</span>
                                    </button>

                                    <button
                                        type="button"
                                        disabled={loading}
                                        onClick={() => setSourceModal({ isOpen: true, replaceIndex: index })}
                                        className={`bg-black/60 hover:bg-white/30 text-white backdrop-blur-md rounded-lg p-1 shadow-md transition-all cursor-pointer border border-white/20 active:scale-95 ${loading ? 'pointer-events-none opacity-50' : ''}`}
                                        title="Replace photo"
                                        aria-label="Replace photo"
                                    >
                                        <DynamicLucideIcon name="sync" className="text-[12px]" />
                                    </button>
                                </div>

                                {index === 0 && (
                                    <div className="absolute top-2 left-2 bg-[#1daddd] text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg shadow-sm border border-white/20 z-10">
                                        Main
                                    </div>
                                )}
                            </div>
                        ))}

                        {imageFiles.length < 5 && (
                            <button
                                type="button"
                                disabled={loading}
                                onClick={() => {
                                    markTouched('photos');
                                    setSourceModal({ isOpen: true, replaceIndex: null });
                                }}
                                className={`cursor-pointer block text-left ${loading ? 'pointer-events-none opacity-50' : ''}`}
                            >
                                <div className={`aspect-[4/3] w-full rounded-2xl border-2 border-dashed ${
                                    touched.photos && imageFiles.length === 0
                                        ? 'border-red-400 dark:border-red-500/60 bg-red-500/5'
                                        : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-[#2E2E32]'
                                } flex flex-col items-center justify-center gap-2 transition-all duration-300 hover:border-[#1daddd] hover:bg-[#1daddd]/5 active:scale-[0.98]`}>
                                    <div className={`size-10 rounded-full ${
                                        touched.photos && imageFiles.length === 0
                                            ? 'bg-red-500/10 text-red-500'
                                            : 'bg-[#1daddd]/10 text-[#1daddd]'
                                    } flex items-center justify-center`}>
                                        <DynamicLucideIcon name="add_a_photo" />
                                    </div>
                                    <div className="text-center">
                                        <p className={`${touched.photos && imageFiles.length === 0 ? 'text-red-500' : 'text-[#1daddd]'} font-bold text-xs uppercase tracking-widest`}>
                                            {imageFiles.length === 0 ? 'Add Photo' : 'Add More'}
                                        </p>
                                        <p className="text-gray-400 text-[9px] font-medium mt-0.5">
                                            Camera & Gallery
                                        </p>
                                    </div>
                                </div>
                            </button>
                        )}
                    </div>
                    {touched.photos && imageFiles.length === 0 && (
                        <p className="mt-2 text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5 ml-1 animate-fade-in">
                            <DynamicLucideIcon name="error" className="text-sm shrink-0" />
                            <span>Please add at least 1 photo of your item</span>
                        </p>
                    )}
                </section>

                {/* Form Fields */}
                <section className="px-4 space-y-6">
                    {/* Item Name */}
                    {(() => {
                        const titleTrimmed = (formData.title || '').trim();
                        const isTitleEmpty = titleTrimmed.length === 0;
                        const isTitleTooShort = !isTitleEmpty && titleTrimmed.length < 3;
                        const isTitleValid = titleTrimmed.length >= 3;
                        const showTitleError = (touched.title || isTitleTooShort) && !isTitleValid;
                        const charsNeeded = Math.max(0, 3 - titleTrimmed.length);

                        return (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between ml-1">
                                    <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200" htmlFor="title">
                                        Title
                                    </label>
                                    {isTitleValid ? (
                                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2.5 py-0.5 rounded-full animate-fade-in">
                                            <DynamicLucideIcon name="check_circle" className="text-xs" />
                                            <span>Valid</span>
                                        </span>
                                    ) : showTitleError ? (
                                        <span className="text-[11px] font-bold text-red-600 dark:text-red-400 flex items-center gap-1 bg-red-500/10 px-2.5 py-0.5 rounded-full animate-pulse">
                                            <DynamicLucideIcon name="info" className="text-xs" />
                                            <span>{isTitleEmpty ? 'Required' : `${charsNeeded} more needed`}</span>
                                        </span>
                                    ) : (
                                        <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">Min. 3 chars</span>
                                    )}
                                </div>
                                <input
                                    required
                                    disabled={loading}
                                    maxLength={80}
                                    className={`w-full bg-[#F5F5F5] dark:bg-[#2E2E32] rounded-xl px-4 py-4 text-base font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none transition-all disabled:opacity-50 ${
                                        showTitleError
                                            ? 'ring-2 ring-red-500/60 dark:ring-red-500/60 focus:ring-2 focus:ring-red-500'
                                            : isTitleValid
                                                ? 'ring-1 ring-emerald-500/30 dark:ring-emerald-500/30 focus:ring-2 focus:ring-emerald-500/50'
                                                : 'border-none focus:ring-2 focus:ring-primary/50'
                                    }`}
                                    id="title"
                                    name="title"
                                    placeholder="What are you selling?"
                                    type="text"
                                    value={formData.title}
                                    onChange={handleChange}
                                    onBlur={() => markTouched('title')}
                                />
                                {showTitleError && (
                                    <p className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1 ml-1 animate-fade-in">
                                        <DynamicLucideIcon name="error" className="text-sm shrink-0" />
                                        <span>{isTitleEmpty ? 'Title is required (at least 3 characters)' : `Title must be at least 3 characters long (${charsNeeded} more needed)`}</span>
                                    </p>
                                )}
                            </div>
                        );
                    })()}

                    {/* Price & Category Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Price Field */}
                        {(() => {
                            const priceStr = formData.price !== undefined && formData.price !== null ? String(formData.price).trim() : '';
                            const priceNum = parseFloat(priceStr);
                            const isPriceEmpty = priceStr.length === 0;
                            const isPriceInvalid = !isPriceEmpty && (isNaN(priceNum) || priceNum < 0 || priceNum > 1000000);
                            const isPriceValid = !isPriceEmpty && !isNaN(priceNum) && priceNum >= 0 && priceNum <= 1000000;
                            const showPriceError = (touched.price || isPriceInvalid) && !isPriceValid;

                            return (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between ml-1">
                                        <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200" htmlFor="price">
                                            Price
                                        </label>
                                        {isPriceValid ? (
                                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full animate-fade-in">
                                                <DynamicLucideIcon name="check_circle" className="text-xs" />
                                                <span>Valid</span>
                                            </span>
                                        ) : showPriceError ? (
                                            <span className="text-[11px] font-bold text-red-600 dark:text-red-400 flex items-center gap-1 bg-red-500/10 px-2 py-0.5 rounded-full animate-pulse">
                                                <span>{isPriceEmpty ? 'Required' : 'Invalid'}</span>
                                            </span>
                                        ) : null}
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₵</span>
                                        <input
                                            required
                                            disabled={loading}
                                            min="0.00"
                                            max="1000000.00"
                                            className={`w-full bg-[#F5F5F5] dark:bg-[#2E2E32] rounded-xl pl-8 pr-4 py-4 text-base font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none transition-all disabled:opacity-50 ${
                                                showPriceError
                                                    ? 'ring-2 ring-red-500/60 dark:ring-red-500/60 focus:ring-2 focus:ring-red-500'
                                                    : isPriceValid
                                                        ? 'ring-1 ring-emerald-500/30 dark:ring-emerald-500/30 focus:ring-2 focus:ring-emerald-500/50'
                                                        : 'border-none focus:ring-2 focus:ring-primary/50'
                                            }`}
                                            id="price"
                                            name="price"
                                            placeholder="0.00"
                                            type="number"
                                            step="0.01"
                                            value={formData.price}
                                            onChange={handleChange}
                                            onBlur={() => markTouched('price')}
                                        />
                                    </div>
                                    {showPriceError && (
                                        <p className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1 ml-1 animate-fade-in">
                                            <DynamicLucideIcon name="error" className="text-sm shrink-0" />
                                            <span>{isPriceEmpty ? 'Price is required' : priceNum > 1000000 ? 'Max ₵1,000,000' : 'Enter a valid price'}</span>
                                        </p>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Category Field */}
                        {(() => {
                            const isCategoryEmpty = !formData.category;
                            const showCategoryError = touched.category && isCategoryEmpty;
                            const isCategoryValid = !isCategoryEmpty;

                            return (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between ml-1">
                                        <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200" htmlFor="category">
                                            Category
                                        </label>
                                        {isCategoryValid ? (
                                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full animate-fade-in">
                                                <DynamicLucideIcon name="check_circle" className="text-xs" />
                                                <span>Valid</span>
                                            </span>
                                        ) : showCategoryError ? (
                                            <span className="text-[11px] font-bold text-red-600 dark:text-red-400 flex items-center gap-1 bg-red-500/10 px-2 py-0.5 rounded-full animate-pulse">
                                                <span>Required</span>
                                            </span>
                                        ) : null}
                                    </div>
                                    <CategorySelector
                                        id="category"
                                        value={formData.category}
                                        hasError={showCategoryError}
                                        onChange={(category) => {
                                            setFormData((prev) => ({ ...prev, category }));
                                            markTouched('category');
                                        }}
                                        onBlur={() => markTouched('category')}
                                        disabled={loading}
                                    />
                                    {showCategoryError && (
                                        <p className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1 ml-1 animate-fade-in">
                                            <DynamicLucideIcon name="error" className="text-sm shrink-0" />
                                            <span>Please select a category</span>
                                        </p>
                                    )}
                                </div>
                            );
                        })()}
                    </div>

                    {/* Condition Chips */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 ml-1" id="condition-label">
                            Condition
                        </label>
                        <div role="radiogroup" aria-labelledby="condition-label" className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                            {['New', 'Like New', 'Good', 'Fair', 'Acceptable'].map((cond) => (
                                <button
                                    key={cond}
                                    type="button"
                                    role="radio"
                                    aria-checked={formData.condition === cond}
                                    disabled={loading}
                                    onClick={() => handleConditionChange(cond)}
                                    className={`chip ${formData.condition === cond ? 'chip-active shadow-lg shadow-primary/25' : 'chip-inactive'} disabled:opacity-50`}
                                >
                                    {cond}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Location */}
                    <div className="space-y-2 relative">
                        <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 ml-1" htmlFor="campus">
                            Location
                        </label>
                        <div className="relative">
                            <input
                                disabled={loading}
                                className="w-full bg-[#F5F5F5] dark:bg-[#2E2E32] border-none rounded-xl px-4 py-4 pr-10 text-base font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow disabled:opacity-50"
                                id="campus"
                                name="campus"
                                placeholder="Search by name, abbreviation (e.g. UG), or region..."
                                type="text"
                                value={campusSearch}
                                onChange={(e) => {
                                    setCampusSearch(e.target.value);
                                    setFormData((prev) => ({ ...prev, campus: e.target.value }));
                                    setShowCampusDropdown(true);
                                }}
                                onFocus={() => setShowCampusDropdown(true)}
                                onBlur={() => {
                                    setTimeout(() => setShowCampusDropdown(false), 250);
                                }}
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                <DynamicLucideIcon name="search" className="text-xl" />
                            </div>
                        </div>

                        {/* Search Results Dropdown */}
                        {showCampusDropdown && (
                            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-[#2E2E32] border border-gray-100 dark:border-gray-800 rounded-xl shadow-xl max-h-60 overflow-y-auto scrollbar-thin animate-fade-in">
                                {campuses.filter((c) => {
                                    const q = campusSearch.toLowerCase();
                                    return (
                                        c.name.toLowerCase().includes(q) ||
                                        c.abbreviation.toLowerCase().includes(q) ||
                                        c.region.toLowerCase().includes(q)
                                    );
                                }).length > 0 ? (
                                    campuses
                                        .filter((c) => {
                                            const q = campusSearch.toLowerCase();
                                            return (
                                                c.name.toLowerCase().includes(q) ||
                                                c.abbreviation.toLowerCase().includes(q) ||
                                                c.region.toLowerCase().includes(q)
                                            );
                                        })
                                        .map((c) => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => {
                                                    setFormData((prev) => ({ ...prev, campus: c.name }));
                                                    setCampusSearch(c.name);
                                                    setShowCampusDropdown(false);
                                                }}
                                                className="w-full px-4 py-3 text-left hover:bg-primary/5 hover:text-primary transition-colors flex flex-col gap-0.5 border-b border-gray-50 dark:border-gray-800/50 last:border-none"
                                            >
                                                <span className="text-sm font-black text-gray-900 dark:text-white">
                                                    {c.name} ({c.abbreviation})
                                                </span>
                                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
                                                    {c.region}
                                                </span>
                                            </button>
                                        ))
                                ) : (
                                    <div className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                        No campuses found. You can keep typing to use a custom location.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    {(() => {
                        const descTrimmed = (formData.description || '').trim();
                        const descLength = descTrimmed.length;
                        const hasStarted = (formData.description || '').length > 0;
                        const isDescEmpty = descLength === 0;
                        const isDescTooShort = !isDescEmpty && descLength < 10;
                        const isDescValid = descLength >= 10;
                        const showDescError = (touched.description || isDescTooShort) && !isDescValid;
                        const charsNeeded = Math.max(0, 10 - descLength);

                        return (
                            <div className="space-y-2 pb-6">
                                <div className="flex items-center justify-between ml-1">
                                    <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200" htmlFor="description">
                                        Description
                                    </label>
                                    {isDescValid ? (
                                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2.5 py-0.5 rounded-full animate-fade-in">
                                            <DynamicLucideIcon name="check_circle" className="text-xs" />
                                            <span>Valid length</span>
                                        </span>
                                    ) : isDescTooShort ? (
                                        <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 bg-amber-500/10 px-2.5 py-0.5 rounded-full animate-pulse">
                                            <DynamicLucideIcon name="info" className="text-xs" />
                                            <span>{charsNeeded} more {charsNeeded === 1 ? 'char' : 'chars'} needed</span>
                                        </span>
                                    ) : showDescError ? (
                                        <span className="text-[11px] font-bold text-red-600 dark:text-red-400 flex items-center gap-1 bg-red-500/10 px-2.5 py-0.5 rounded-full animate-pulse">
                                            <span>Required</span>
                                        </span>
                                    ) : (
                                        <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
                                            Min. 10 characters
                                        </span>
                                    )}
                                </div>

                                <div className="relative">
                                    <textarea
                                        required
                                        disabled={loading}
                                        aria-describedby="char-counter desc-live-feedback"
                                        className={`w-full bg-[#F5F5F5] dark:bg-[#2E2E32] rounded-2xl px-4 py-4 text-base font-normal text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none transition-all resize-none disabled:opacity-50 ${
                                            isDescTooShort
                                                ? 'ring-2 ring-amber-500/60 dark:ring-amber-500/60 focus:ring-2 focus:ring-amber-500'
                                                : showDescError && isDescEmpty
                                                    ? 'ring-2 ring-red-500/60 dark:ring-red-500/60 focus:ring-2 focus:ring-red-500'
                                                    : isDescValid
                                                        ? 'ring-1 ring-emerald-500/30 dark:ring-emerald-500/30 focus:ring-2 focus:ring-emerald-500/50'
                                                        : 'border-none focus:ring-2 focus:ring-primary/50'
                                        }`}
                                        id="description"
                                        name="description"
                                        placeholder="Describe the item details, defects, or preferred pickup location..."
                                        rows="5"
                                        value={formData.description}
                                        onChange={handleChange}
                                        onBlur={() => markTouched('description')}
                                        maxLength={300}
                                    ></textarea>
                                </div>

                                {/* Visual Progress Bar toward 10 chars requirement */}
                                {hasStarted && (
                                    <div className="w-full bg-gray-200 dark:bg-gray-700/60 h-1.5 rounded-full overflow-hidden transition-all">
                                        <div
                                            className={`h-full transition-all duration-300 rounded-full ${
                                                isDescValid ? 'bg-emerald-500' : 'bg-amber-500'
                                            }`}
                                            style={{ width: `${Math.min(100, (descLength / 10) * 100)}%` }}
                                        />
                                    </div>
                                )}

                                <div className="flex items-center justify-between px-1" id="desc-live-feedback">
                                    <div>
                                        {isDescTooShort ? (
                                            <p className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 animate-fade-in">
                                                <DynamicLucideIcon name="error" className="text-sm shrink-0" />
                                                <span>Description must be at least 10 characters long</span>
                                            </p>
                                        ) : showDescError && isDescEmpty ? (
                                            <p className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1 animate-fade-in">
                                                <DynamicLucideIcon name="error" className="text-sm shrink-0" />
                                                <span>Description is required (minimum 10 characters)</span>
                                            </p>
                                        ) : isDescValid ? (
                                            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-fade-in">
                                                <DynamicLucideIcon name="check" className="text-sm shrink-0" />
                                                <span>Ready to save</span>
                                            </p>
                                        ) : (
                                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                                Please enter at least 10 characters
                                            </p>
                                        )}
                                    </div>
                                    <p
                                        id="char-counter"
                                        aria-live="polite"
                                        className={`text-xs font-semibold transition-colors ${
                                            isDescTooShort
                                                ? 'text-amber-600 dark:text-amber-400'
                                                : showDescError && isDescEmpty
                                                    ? 'text-red-600 dark:text-red-400'
                                                    : isDescValid
                                                        ? 'text-emerald-600 dark:text-emerald-400'
                                                        : 'text-gray-400 dark:text-gray-500'
                                        }`}
                                    >
                                        {formData.description.length}/300
                                    </p>
                                </div>
                            </div>
                        );
                    })()}
                </section>

                {/* Sticky Bottom Action Bar */}
                <footer className="fixed bottom-0 left-0 right-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-white/90 dark:bg-[#242428]/90 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 z-[100]">
                    <div className="max-w-[430px] mx-auto w-full">
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full h-14 shadow-xl shadow-primary/20 disabled:opacity-50"
                        >
                            <span>{loading ? (uploadProgress || 'Saving...') : 'Save Changes'}</span>
                            {!loading && <DynamicLucideIcon name="arrow_forward" className="text-xl" />}
                        </button>
                    </div>
                </footer>
            </form>

            {/* Photo Source Selector Modal (Camera vs Gallery) */}
            <PhotoSourceModal
                isOpen={sourceModal.isOpen}
                onClose={() => setSourceModal({ isOpen: false, replaceIndex: null })}
                onOpenInAppCamera={(replaceIndex) => setCameraModal({ isOpen: true, replaceIndex })}
                onFilesSelected={handleFilesSelected}
                replaceIndex={sourceModal.replaceIndex}
                remainingSlots={5 - imageFiles.length}
            />

            {/* In-App Live Camera Viewfinder Modal */}
            <InAppCameraModal
                isOpen={cameraModal.isOpen}
                onClose={() => setCameraModal({ isOpen: false, replaceIndex: null })}
                onPhotosCaptured={handleFilesSelected}
                maxPhotos={5 - imageFiles.length}
                replaceIndex={cameraModal.replaceIndex}
            />

            {/* Image Cropping Modal */}
            <ImageCropModal
                isOpen={cropModal.isOpen}
                images={cropModal.images}
                onCropDone={handleCropDone}
                onCancel={() => setCropModal({ isOpen: false, images: [], replaceIndex: null })}
            />
        </main>
    );
}
