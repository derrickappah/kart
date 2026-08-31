'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { validateImage, compressProductImage, convertHeicToJpeg } from '@/utils/imageUtils';
import { createListingAction } from './actions';
import LoadingScreen from '@/components/LoadingScreen';
import CategorySelector from '@/components/CategorySelector';
import ImageCropModal from '@/components/ImageCropModal';
import PhotoSourceModal from '@/components/PhotoSourceModal';

export default function CreateListingPage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    const [error, setError] = useState(null);
    const [imageFiles, setImageFiles] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [subscriptionStatus, setSubscriptionStatus] = useState(null);
    const [verificationStatus, setVerificationStatus] = useState(null);
    const [checkingSubscription, setCheckingSubscription] = useState(true);
    const [sourceModal, setSourceModal] = useState({
        isOpen: false,
        replaceIndex: null,
    });
    const [cropModal, setCropModal] = useState({
        isOpen: false,
        images: [],
        replaceIndex: null,
    });

    const isSubmittingRef = useRef(false);
    const previewsRef = useRef(imagePreviews);

    const [formData, setFormData] = useState({
        title: '',
        price: '',
        category: '',
        condition: 'New',
        description: '',
        campus: '',
    });

    const [campuses, setCampuses] = useState([]);
    const [campusSearch, setCampusSearch] = useState('');
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
            const hasChanges = formData.title || formData.price || formData.description || imageFiles.length > 0;
            if (hasChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [formData, imageFiles]);


    // Check subscription and verification status on mount
    useEffect(() => {
        const checkAccess = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push('/login');
                    return;
                }

                // Fetch subscriptions and profile in parallel
                const [subsResult, profileResult] = await Promise.all([
                    supabase
                        .from('subscriptions')
                        .select('*, plan:subscription_plans(*)')
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: false }),
                    supabase
                        .from('profiles')
                        .select('is_verified, verification_status')
                        .eq('id', user.id)
                        .single()
                ]);

                const allSubscriptions = subsResult.data;
                const profile = profileResult.data;

                const subscription = allSubscriptions?.find(sub =>
                    (sub.status === 'Active' || sub.status === 'active') &&
                    new Date(sub.end_date) > new Date()
                );

                if (subscription) {
                    setSubscriptionStatus('active');
                } else {
                    setSubscriptionStatus('expired');
                }

                if (profile) {
                    const isVerified = profile.is_verified || profile.verification_status === 'Approved';
                    setVerificationStatus(isVerified ? 'approved' : (profile.verification_status || 'none'));
                } else {
                    setVerificationStatus('none');
                }
            } catch (err) {
                setSubscriptionStatus('expired');
                setVerificationStatus('none');
            } finally {
                setCheckingSubscription(false);
            }
        };
        checkAccess();
    }, [router, supabase]);

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

                const newFiles = [...imageFiles];
                newFiles[replaceIndex] = {
                    file: convertedFile,
                    dataUrl: processed.dataUrl,
                    originalSrc: originalUrl,
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
            console.error('[CreateListing] Photo selection processing error:', err);
            setError('Failed to process selected photos. Please try again.');
        }
    };

    // Fallback file input change handler
    const handleFileChange = async (e, replaceIndex = null) => {
        if (e.target.files && e.target.files.length > 0) {
            await handleFilesSelected(Array.from(e.target.files), replaceIndex);
        }
        e.target.value = '';
    };

    // Open crop modal to re-crop an existing uploaded thumbnail
    const openReCrop = (index) => {
        const item = imageFiles[index];
        if (!item) return;

        const src = item.originalSrc || item.dataUrl || imagePreviews[index];
        setCropModal({
            isOpen: true,
            images: [
                {
                    src,
                    originalSrc: item.originalSrc || src,
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

                const newFiles = [...imageFiles];
                newFiles[replaceIdx] = {
                    file: item.file || item.blob || item.rawFile,
                    dataUrl: processed.dataUrl || item.dataUrl,
                    originalSrc: item.originalSrc,
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
            console.error('[CreateListing] Error processing cropped images:', err);
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
            previewsRef.current.forEach(url => {
                if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
            });
        };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
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

            // Step 1: Collect compressed photo payloads
            const imagesPayload = [];
            console.log('[CreateListing] imageFiles state:', imageFiles.length, 'items');
            
            if (imageFiles.length > 0) {
                for (let i = 0; i < imageFiles.length; i++) {
                    const item = imageFiles[i];
                    console.log(`[CreateListing] imageFiles[${i}]:`, {
                        hasDataUrl: !!item.dataUrl,
                        dataUrlLength: item.dataUrl ? item.dataUrl.length : 0,
                        dataUrlPrefix: item.dataUrl ? item.dataUrl.substring(0, 50) : 'NONE',
                        hasFile: !!item.file,
                        itemType: typeof item,
                        itemKeys: typeof item === 'object' ? Object.keys(item) : 'N/A'
                    });
                    
                    if (item.dataUrl) {
                        imagesPayload.push(item.dataUrl);
                    } else {
                        setUploadProgress(`Processing photo ${i + 1} of ${imageFiles.length}...`);
                        const processed = await compressProductImage(item.file || item);
                        console.log(`[CreateListing] Fallback compress result for [${i}]:`, {
                            hasDataUrl: !!processed.dataUrl,
                            dataUrlLength: processed.dataUrl ? processed.dataUrl.length : 0
                        });
                        if (processed.dataUrl) {
                            imagesPayload.push(processed.dataUrl);
                        }
                    }
                }
            }

            console.log('[CreateListing] Final imagesPayload:', imagesPayload.length, 'items');
            for (let i = 0; i < imagesPayload.length; i++) {
                console.log(`[CreateListing] imagesPayload[${i}]: length=${imagesPayload[i].length}, prefix="${imagesPayload[i].substring(0, 60)}"`);
            }

            if (imageFiles.length > 0 && imagesPayload.length === 0) {
                throw new Error('Could not process selected photos. Please re-select your photos and try again.');
            }

            setUploadProgress('Creating listing on server...');

            // Step 2: Call Server Action to handle atomic storage upload & database insert
            console.log('[CreateListing] Calling createListingAction with', imagesPayload.length, 'images');
            const result = await createListingAction({
                title: titleTrimmed,
                price: priceNum,
                category: formData.category,
                condition: formData.condition,
                description: descriptionTrimmed,
                campus: campusTrimmed || null,
                images: imagesPayload
            });

            console.log('[CreateListing] Server action result:', {
                success: result.success,
                error: result.error,
                productId: result.productId,
                debug: result.debug
            });

            if (!result.success) {
                // Include server debug info in error message
                const debugInfo = result.debug ? `\n\n[Server Debug]\n${result.debug}` : '';
                throw new Error((result.error || 'Failed to create listing') + debugInfo);
            }

            // Show debug info in console even on success
            // Step 3: Navigate directly to celebration success page
            const targetUrl = result.productId 
                ? `/dashboard/seller/create/success?id=${result.productId}`
                : '/dashboard/seller/listings';

            window.location.href = targetUrl;
            return;

        } catch (err) {
            console.error('[CreateListing] Submit error:', err);
            setError(err.message || 'Failed to create listing. Please try again.');
            isSubmittingRef.current = false;
            setLoading(false);
            setUploadProgress('');
        }
    };

    if (checkingSubscription) {
        return <LoadingScreen message="Checking access..." fullScreen={false} />;
    }

    if (subscriptionStatus !== 'active') {
        return (
            <main className="bg-white dark:bg-[#242428] min-h-screen flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-6">
                    <DynamicLucideIcon name="lock" className="text-4xl" />
                </div>
                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">Subscription Required</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm">
                    You need an active subscription to create listings. Choose a plan to start selling on KART.
                </p>
                <Link href="/subscriptions" className="w-full max-w-xs btn-primary h-14">
                    View Subscription Plans
                </Link>
            </main>
        );
    }

    if (verificationStatus !== 'approved') {
        const isPending = verificationStatus === 'Pending';
        return (
            <main className="bg-white dark:bg-[#242428] min-h-screen flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-6">
                    <DynamicLucideIcon name={isPending ? 'schedule' : 'verified_user'} className="text-4xl" />
                </div>
                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">
                    {isPending ? 'Verification Pending' : 'Verification Required'}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm">
                    {isPending
                        ? 'Your verification request is currently under review. We will notify you once it has been approved.'
                        : 'To keep our campus marketplace safe, we verify all sellers. Please complete your identity verification to start listing.'}
                </p>
                <Link
                    href="/dashboard/settings/verify"
                    className="w-full max-w-xs h-14 bg-primary hover:bg-[#159ac6] text-white rounded-xl font-bold flex items-center justify-center shadow-lg shadow-primary/25 active:scale-[0.98] transition-all"
                >
                    {isPending ? 'Check Progress' : 'Verify Identity'}
                </Link>
            </main>
        );
    }

    return (
        <main className="bg-white dark:bg-[#242428] font-display text-gray-900 dark:text-white min-h-screen flex flex-col pt-4">
            {/* Main Content Area */}
            <form onSubmit={handleSubmit} className="flex-1 pb-36 relative max-w-[430px] mx-auto w-full">
                {error && (
                    <div className="mx-4 mt-4 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium">
                        {error}
                    </div>
                )}

                {/* Photo Upload Section */}
                <section className="p-4">
                    <div className="grid grid-cols-2 gap-3">
                        {imagePreviews.map((url, index) => (
                            <div key={url + index} className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm animate-fade-in group bg-white dark:bg-gray-800">
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
                                    <div className="absolute bottom-2 left-2 bg-[#1daddd] text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg shadow-sm border border-white/20">
                                        Main Photo
                                    </div>
                                )}
                            </div>
                        ))}

                        {imageFiles.length < 5 && (
                            <button
                                type="button"
                                disabled={loading}
                                onClick={() => setSourceModal({ isOpen: true, replaceIndex: null })}
                                className={`cursor-pointer block text-left ${loading ? 'pointer-events-none opacity-50' : ''}`}
                            >
                                <div className="aspect-[4/3] w-full rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-[#2E2E32] flex flex-col items-center justify-center gap-2 transition-all duration-300 hover:border-[#1daddd] hover:bg-[#1daddd]/5 active:scale-[0.98]">
                                    <div className="size-10 rounded-full bg-[#1daddd]/10 flex items-center justify-center text-[#1daddd]">
                                        <DynamicLucideIcon name="add_a_photo" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[#1daddd] font-bold text-xs uppercase tracking-widest">
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
                </section>

                {/* Form Fields */}
                <section className="px-4 space-y-6">
                    {/* Item Name */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 ml-1" htmlFor="title">Title</label>
                        <input
                            required
                            disabled={loading}
                            maxLength={80}
                            className="w-full bg-[#F5F5F5] dark:bg-[#2E2E32] border-none rounded-xl px-4 py-4 text-base font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow disabled:opacity-50"
                            id="title"
                            name="title"
                            placeholder="What are you selling?"
                            type="text"
                            value={formData.title}
                            onChange={handleChange}
                        />
                    </div>

                    {/* Price & Category Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 ml-1" htmlFor="price">Price</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₵</span>
                                <input
                                    required
                                    disabled={loading}
                                    min="0.00"
                                    max="1000000.00"
                                    className="w-full bg-[#F5F5F5] dark:bg-[#2E2E32] border-none rounded-xl pl-8 pr-4 py-4 text-base font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow disabled:opacity-50"
                                    id="price"
                                    name="price"
                                    placeholder="0.00"
                                    type="number"
                                    step="0.01"
                                    value={formData.price}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 ml-1" htmlFor="category">Category</label>
                            <CategorySelector
                                id="category"
                                value={formData.category}
                                onChange={(category) => setFormData((prev) => ({ ...prev, category }))}
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {/* Condition Chips */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 ml-1" id="condition-label">Condition</label>
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
                        <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 ml-1" htmlFor="campus">Location</label>
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
                                    setFormData(prev => ({ ...prev, campus: e.target.value }));
                                    setShowCampusDropdown(true);
                                }}
                                onFocus={() => setShowCampusDropdown(true)}
                                onBlur={() => {
                                    // Delay to let click event on option fire before dropdown hides
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
                                {campuses.filter(c => {
                                    const q = campusSearch.toLowerCase();
                                    return (
                                        c.name.toLowerCase().includes(q) ||
                                        c.abbreviation.toLowerCase().includes(q) ||
                                        c.region.toLowerCase().includes(q)
                                    );
                                }).length > 0 ? (
                                    campuses.filter(c => {
                                        const q = campusSearch.toLowerCase();
                                        return (
                                            c.name.toLowerCase().includes(q) ||
                                            c.abbreviation.toLowerCase().includes(q) ||
                                            c.region.toLowerCase().includes(q)
                                        );
                                    }).map((c) => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => {
                                                setFormData(prev => ({ ...prev, campus: c.name }));
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
                    <div className="space-y-2 pb-6">
                        <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 ml-1" htmlFor="description">Description</label>
                        <textarea
                            required
                            disabled={loading}
                            aria-describedby="char-counter"
                            className="w-full bg-[#F5F5F5] dark:bg-[#2E2E32] border-none rounded-2xl px-4 py-4 text-base font-normal text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow resize-none disabled:opacity-50"
                            id="description"
                            name="description"
                            placeholder="Describe the item details, defects, or preferred pickup location..."
                            rows="5"
                            value={formData.description}
                            onChange={handleChange}
                            maxLength={300}
                        ></textarea>
                        <div className="flex justify-end px-1">
                            <p id="char-counter" aria-live="polite" className="text-xs font-medium text-gray-400">{formData.description.length}/300 characters</p>
                        </div>
                    </div>


                </section>

                {/* Sticky Bottom Action Bar */}
                <footer className="fixed bottom-0 left-0 right-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-white/90 dark:bg-[#242428]/90 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 z-[100]">
                    <div className="max-w-[430px] mx-auto w-full">
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full h-14 shadow-xl shadow-primary/20 disabled:opacity-50"
                        >
                            <span>{loading ? (uploadProgress || 'Posting...') : 'Post Item'}</span>
                            {!loading && <DynamicLucideIcon name="arrow_forward" className="text-xl" />}
                        </button>
                    </div>
                </footer>
            </form>

            {/* Photo Source Selector Modal (Camera vs Gallery) */}
            <PhotoSourceModal
                isOpen={sourceModal.isOpen}
                onClose={() => setSourceModal({ isOpen: false, replaceIndex: null })}
                onFilesSelected={handleFilesSelected}
                replaceIndex={sourceModal.replaceIndex}
                remainingSlots={5 - imageFiles.length}
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
