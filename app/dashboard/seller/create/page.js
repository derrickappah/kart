'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { validateImage, compressProductImage } from '@/utils/imageUtils';
import { createListingAction } from './actions';
import LoadingScreen from '@/components/LoadingScreen';
import CategorySelector from '@/components/CategorySelector';

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

    // Unified handle for file changes with validation
    const handleFileChange = (e, replaceIndex = null) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);

            // Validate each file
            for (const file of files) {
                const validation = validateImage(file);
                if (!validation.valid) {
                    setError(validation.error);
                    e.target.value = '';
                    return;
                }
            }

            if (replaceIndex !== null) {
                // Replacing a specific image
                const file = files[0];
                const newFiles = [...imageFiles];
                newFiles[replaceIndex] = file;

                // Cleanup old preview
                if (imagePreviews[replaceIndex]) {
                    URL.revokeObjectURL(imagePreviews[replaceIndex]);
                }

                const newPreviews = [...imagePreviews];
                newPreviews[replaceIndex] = URL.createObjectURL(file);

                setImageFiles(newFiles);
                setImagePreviews(newPreviews);
            } else {
                // Adding new images
                const remainingSlots = 5 - imageFiles.length;
                if (files.length > remainingSlots) {
                    setError(`You can only add up to 5 photos. ${remainingSlots} slot(s) remaining.`);
                    e.target.value = '';
                    return;
                }

                const filesToAdd = files;
                const nextFiles = [...imageFiles, ...filesToAdd];

                const nextPreviews = [
                    ...imagePreviews,
                    ...filesToAdd.map(file => URL.createObjectURL(file))
                ];

                setImageFiles(nextFiles);
                setImagePreviews(nextPreviews);
            }
        }
        // Reset input value so same file can be selected again
        e.target.value = '';
    };

    const removeImage = (index) => {
        if (imagePreviews[index]) {
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
            previewsRef.current.forEach(url => URL.revokeObjectURL(url));
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

            // Step 1: Compress images client-side into lightweight base64 payloads
            const imagesPayload = [];
            if (imageFiles.length > 0) {
                for (let i = 0; i < imageFiles.length; i++) {
                    setUploadProgress(`Optimizing photo ${i + 1} of ${imageFiles.length}...`);
                    const { dataUrl } = await compressProductImage(imageFiles[i]);
                    if (dataUrl) {
                        imagesPayload.push(dataUrl);
                    }
                }
            }

            if (imageFiles.length > 0 && imagesPayload.length === 0) {
                throw new Error('Could not process selected photos. Please re-select your photos and try again.');
            }

            setUploadProgress('Creating listing on server...');

            // Step 2: Call Server Action to handle atomic storage upload & database insert
            const result = await createListingAction({
                title: titleTrimmed,
                price: priceNum,
                category: formData.category,
                condition: formData.condition,
                description: descriptionTrimmed,
                campus: campusTrimmed || null,
                images: imagesPayload
            });

            if (!result.success) {
                throw new Error(result.error || 'Failed to create listing');
            }

            router.push(`/dashboard/seller/create/success?id=${result.productId}`);
            router.refresh();

        } catch (err) {
            setError(err.message || 'Failed to create listing. Please try again.');
            isSubmittingRef.current = false;
        } finally {
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
                            <div key={url} className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm animate-fade-in group">
                                <img src={url} className="w-full h-full object-cover" alt={`Preview ${index + 1}`} />
                                <button
                                    type="button"
                                    disabled={loading}
                                    onClick={() => removeImage(index)}
                                    className="absolute top-2 right-2 bg-red-500/90 text-white rounded-full p-1.5 shadow-md hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100 transform translate-y-1 group-hover:translate-y-0 disabled:opacity-50"
                                >
                                    <DynamicLucideIcon name="close" className="text-[16px]" />
                                </button>

                                <label className={`absolute bottom-2 right-2 bg-white/90 dark:bg-[#2E2E32]/90 text-[#111618] dark:text-gray-200 rounded-full p-1.5 shadow-md hover:bg-white dark:hover:bg-[#2E2E32] transition-all opacity-0 group-hover:opacity-100 transform translate-y-1 group-hover:translate-y-0 cursor-pointer border border-gray-100 dark:border-gray-700 ${loading ? 'pointer-events-none opacity-50' : ''}`}>
                                    <input type="file" accept="image/*" disabled={loading} className="sr-only" onChange={(e) => handleFileChange(e, index)} />
                                    <DynamicLucideIcon name="sync" className="text-[16px]" />
                                </label>
                                {index === 0 && (
                                    <div className="absolute bottom-2 left-2 bg-[#1daddd] text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg shadow-sm border border-white/20">
                                        Main Photo
                                    </div>
                                )}
                            </div>
                        ))}

                        {imageFiles.length < 5 && (
                            <label className={`cursor-pointer block ${loading ? 'pointer-events-none opacity-50' : ''}`}>
                                <input type="file" accept="image/*" multiple disabled={loading} onChange={handleFileChange} className="sr-only" />
                                <div className="aspect-[4/3] w-full rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-[#2E2E32] flex flex-col items-center justify-center gap-2 transition-all duration-300 hover:border-[#1daddd] hover:bg-[#1daddd]/5 active:scale-[0.98]">
                                    <div className="size-10 rounded-full bg-[#1daddd]/10 flex items-center justify-center text-[#1daddd]">
                                        <DynamicLucideIcon name="add_a_photo" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[#1daddd] font-bold text-xs uppercase tracking-widest">
                                            {imageFiles.length === 0 ? 'Add Photo' : 'Add More'}
                                        </p>
                                        <p className="text-gray-400 text-[9px] font-medium mt-0.5">
                                            {imageFiles.length}/5 Limit
                                        </p>
                                    </div>
                                </div>
                            </label>
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
        </main>
    );
}
