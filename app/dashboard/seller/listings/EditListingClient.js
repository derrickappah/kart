'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import { validateImage } from '@/utils/imageUtils';

export default function EditListingClient({ product }) {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const isSubmittingRef = useRef(false);

    // Photos state setup: can contain remote or local image references
    const [photos, setPhotos] = useState(() => {
        const initialImages = product?.images || (product?.image_url ? [product?.image_url] : []);
        return initialImages.map(url => ({ type: 'remote', url }));
    });

    const [formData, setFormData] = useState({
        title: product?.title || '',
        price: product?.price || '',
        category: product?.category || 'Other',
        condition: product?.condition || 'Good',
        description: product?.description || '',
        campus: product?.campus || '',
        image_url: product?.image_url || ''
    });

    const categories = [
        'Textbooks',
        'Electronics',
        'Dorm Furniture',
        'Clothing',
        'School Supplies',
        'Tickets & Events',
        'Services & Tutoring',
        'Beauty & Grooming',
        'Sports & Fitness',
        'Kitchenware',
        'Musical Instruments',
        'Games & Consoles',
        'Health & Wellness',
        'Arts & Crafts',
        'Home Appliances'
    ];

    const conditions = ['New', 'Like New', 'Good', 'Fair', 'Poor'];

    const photosRef = useRef(photos);
    useEffect(() => {
        photosRef.current = photos;
    }, [photos]);

    // Clean up local blob URLs ONLY on unmount
    useEffect(() => {
        return () => {
            photosRef.current.forEach(photo => {
                if (photo.type === 'local') {
                    URL.revokeObjectURL(photo.preview);
                }
            });
        };
    }, []);

    // Warn before navigating away if form is dirty
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isSubmittingRef.current) return;
            const isDirty =
                formData.title !== (product?.title || '') ||
                formData.price !== (product?.price || '') ||
                formData.category !== (product?.category || 'Other') ||
                formData.condition !== (product?.condition || 'Good') ||
                formData.description !== (product?.description || '') ||
                formData.campus !== (product?.campus || '') ||
                photos.length !== (product?.images?.length || (product?.image_url ? 1 : 0));
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [formData, photos, product]);

    const handleBackConfirm = (e) => {
        if (isSubmittingRef.current) return;
        const isDirty =
            formData.title !== (product?.title || '') ||
            formData.price !== (product?.price || '') ||
            formData.category !== (product?.category || 'Other') ||
            formData.condition !== (product?.condition || 'Good') ||
            formData.description !== (product?.description || '') ||
            formData.campus !== (product?.campus || '') ||
            photos.length !== (product?.images?.length || (product?.image_url ? 1 : 0));
        if (isDirty) {
            if (!confirm('Are you sure you want to discard your changes?')) {
                e.preventDefault();
            } else {
                router.back();
            }
        } else {
            router.back();
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Unified handle for file changes
    const handleFileChange = (e, replaceIndex = null) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);

            // Validate file types and sizes
            for (const file of files) {
                const validation = validateImage(file);
                if (!validation.valid) {
                    setError(validation.error);
                    e.target.value = '';
                    return;
                }
            }

            if (replaceIndex !== null) {
                // Replacing a specific photo
                const file = files[0];
                const newPhotos = [...photos];
                if (newPhotos[replaceIndex].type === 'local') {
                    URL.revokeObjectURL(newPhotos[replaceIndex].preview);
                }
                newPhotos[replaceIndex] = {
                    type: 'local',
                    file,
                    preview: URL.createObjectURL(file)
                };
                setPhotos(newPhotos);
            } else {
                // Adding new photos
                const remainingSlots = 5 - photos.length;
                if (files.length > remainingSlots) {
                    setError(`You can only add up to 5 photos. ${remainingSlots} slot(s) remaining.`);
                    e.target.value = '';
                    return;
                }
                const newPhotosToAdd = files.map(file => ({
                    type: 'local',
                    file,
                    preview: URL.createObjectURL(file)
                }));
                setPhotos([...photos, ...newPhotosToAdd]);
            }
        }
        e.target.value = '';
    };

    const removePhoto = (index) => {
        const photoToRemove = photos[index];
        if (photoToRemove.type === 'local') {
            URL.revokeObjectURL(photoToRemove.preview);
        }
        setPhotos(photos.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        setLoading(true);
        setError(null);
        isSubmittingRef.current = true;

        const uploadedPaths = [];

        try {
            // Client-side validations
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

            // Upload any local files to storage
            const updatedUrls = [];

            for (const photo of photos) {
                if (photo.type === 'remote') {
                    updatedUrls.push(photo.url);
                } else if (photo.type === 'local') {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) throw new Error('Not authenticated');

                    const fileExt = photo.file.name.split('.').pop();
                    const fileName = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                    const filePath = `${fileName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('products')
                        .upload(filePath, photo.file);

                    if (uploadError) {
                        throw new Error(`Upload failed: ${uploadError.message}`);
                    }

                    uploadedPaths.push(filePath);

                    const { data: { publicUrl } } = supabase.storage
                        .from('products')
                        .getPublicUrl(filePath);

                    updatedUrls.push(publicUrl);
                }
            }

            let mainImageUrl = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=1000';
            if (updatedUrls.length > 0) {
                mainImageUrl = updatedUrls[0];
            }

            const { error } = await supabase
                .from('products')
                .update({
                    title: titleTrimmed,
                    price: priceNum,
                    category: formData.category,
                    condition: formData.condition,
                    description: descriptionTrimmed,
                    campus: campusTrimmed || null,
                    image_url: mainImageUrl,
                    images: updatedUrls
                })
                .eq('id', product.id);

            if (error) throw error;

            router.push('/dashboard/seller/listings');
            router.refresh();
        } catch (err) {
            // Delete newly uploaded images if DB insert/update failed
            if (uploadedPaths.length > 0) {
                try {
                    await supabase.storage.from('products').remove(uploadedPaths);
                } catch (cleanupErr) {
                    console.error('Failed to clean up uploaded images:', cleanupErr);
                }
            }
            setError(err.message);
            isSubmittingRef.current = false;
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-[#242428] font-display antialiased transition-colors duration-200 min-h-screen">
            <div className="relative flex h-full min-h-screen w-full flex-col max-w-md mx-auto bg-white dark:bg-[#242428] overflow-x-hidden shadow-2xl">
                {/* Header */}
                <header className="sticky top-0 z-[100] bg-[#f6f7f9]/95 dark:bg-[#1a1d21]/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 transition-colors">
                    <div className="flex items-center px-4 pt-4 pb-4 justify-between">
                        <button
                            type="button"
                            onClick={handleBackConfirm}
                            disabled={loading}
                            className={`text-[#0e191b] dark:text-[#e0e6e8] flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${loading ? 'pointer-events-none opacity-50' : ''}`}
                        >
                            <DynamicLucideIcon name="arrow_back" className="text-2xl" />
                        </button>
                        <h2 className="text-[#0e191b] dark:text-[#e0e6e8] text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">
                            Edit Listing
                        </h2>
                    </div>
                </header>

                <main className="flex-1 px-5 py-6 space-y-8 pb-32">
                    {error && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl text-red-600 dark:text-red-400 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    {/* Photos Section */}
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-[#0e191b] dark:text-[#e0e6e8] font-bold text-sm">Photos</label>
                            <span className="text-xs text-[#4e8b97] dark:text-[#94aab0] font-medium">{photos.length}/5 added</span>
                        </div>
                        <div className="flex gap-4 overflow-x-auto pb-4 -mx-5 px-5 no-scrollbar">
                            {photos.length < 5 && (
                                <label className={`shrink-0 w-28 h-36 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#22262a] flex flex-col items-center justify-center gap-2 text-[#4e8b97] dark:text-[#94aab0] hover:border-[#149cb8] hover:text-[#149cb8] hover:bg-[#149cb8]/5 transition-all group cursor-pointer ${loading ? 'pointer-events-none opacity-50' : ''}`}>
                                    <input type="file" accept="image/*" multiple disabled={loading} onChange={handleFileChange} className="sr-only" />
                                    <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <DynamicLucideIcon name="add" className="text-2xl" />
                                    </div>
                                    <span className="text-xs font-bold">Add Photo</span>
                                </label>
                            )}

                            {photos.map((photo, index) => {
                                const url = photo.type === 'remote' ? photo.url : photo.preview;
                                return (
                                    <div key={index} className="relative shrink-0 w-28 h-36 rounded-2xl overflow-visible group">
                                        <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-md">
                                            <img
                                                src={url}
                                                alt={`Listing photo ${index + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            disabled={loading}
                                            onClick={() => removePhoto(index)}
                                            className="absolute -top-2 -right-2 bg-white dark:bg-gray-800 text-red-500 shadow-lg rounded-full w-7 h-7 flex items-center justify-center hover:scale-110 transition-transform border border-gray-100 dark:border-gray-700 disabled:opacity-50 z-20"
                                        >
                                            <DynamicLucideIcon name="close" className="text-base" />
                                        </button>
                                        <label className={`absolute bottom-2 right-2 bg-white/90 dark:bg-[#2E2E32]/90 text-[#111618] dark:text-gray-200 rounded-full p-1.5 shadow-md hover:bg-white dark:hover:bg-[#2E2E32] transition-all opacity-0 group-hover:opacity-100 transform translate-y-1 group-hover:translate-y-0 cursor-pointer border border-gray-100 dark:border-gray-700 ${loading ? 'pointer-events-none opacity-50' : ''}`}>
                                            <input type="file" accept="image/*" disabled={loading} className="sr-only" onChange={(e) => handleFileChange(e, index)} />
                                            <DynamicLucideIcon name="sync" className="text-[14px]" />
                                        </label>
                                        {index === 0 && (
                                            <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold text-white z-10">Main</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* Form Fields */}
                    <section className="space-y-6">
                        {/* Item Name */}
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-[#0e191b] dark:text-[#e0e6e8] ml-1" htmlFor="title">Item Name</label>
                            <div className="relative">
                                <input
                                    required
                                    disabled={loading}
                                    maxLength={80}
                                    className="block w-full rounded-2xl border-0 py-4 px-4 text-[#0e191b] dark:text-[#e0e6e8] shadow-sm bg-white dark:bg-[#22262a] ring-1 ring-inset ring-gray-200 dark:ring-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#149cb8] sm:text-sm sm:leading-6 transition-shadow font-medium disabled:opacity-50"
                                    id="title"
                                    name="title"
                                    type="text"
                                    value={formData.title}
                                    onChange={handleChange}
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                                    <DynamicLucideIcon name="edit" className="text-gray-400" />
                                </div>
                            </div>
                        </div>

                        {/* Price & Category */}
                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-[#0e191b] dark:text-[#e0e6e8] ml-1" htmlFor="price">Price</label>
                                <div className="relative rounded-2xl shadow-sm">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                                        <span className="text-[#4e8b97] dark:text-[#94aab0] font-bold text-lg">₵</span>
                                    </div>
                                    <input
                                        required
                                        disabled={loading}
                                        min="0.00"
                                        max="1000000.00"
                                        className="block w-full rounded-2xl border-0 py-4 pl-9 pr-4 text-[#0e191b] dark:text-[#e0e6e8] bg-white dark:bg-[#22262a] ring-1 ring-inset ring-gray-200 dark:ring-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#149cb8] sm:text-lg sm:leading-6 font-bold transition-shadow text-right disabled:opacity-50"
                                        id="price"
                                        name="price"
                                        type="number"
                                        step="0.01"
                                        value={formData.price}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-[#0e191b] dark:text-[#e0e6e8] ml-1" htmlFor="category">Category</label>
                                <div className="relative">
                                    <select
                                        required
                                        disabled={loading}
                                        className="block w-full rounded-2xl border-0 py-4 pl-4 pr-10 text-[#0e191b] dark:text-[#e0e6e8] shadow-sm bg-none bg-white dark:bg-[#22262a] ring-1 ring-inset ring-gray-200 dark:ring-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#149cb8] sm:text-sm sm:leading-6 font-medium appearance-none transition-shadow disabled:opacity-50"
                                        id="category"
                                        name="category"
                                        value={formData.category}
                                        onChange={handleChange}
                                    >
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                                        <DynamicLucideIcon name="expand_more" className="text-gray-400" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Condition */}
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-[#0e191b] dark:text-[#e0e6e8] ml-1" id="condition-label">Condition</label>
                            <div role="radiogroup" aria-labelledby="condition-label" className="grid grid-cols-5 gap-1.5">
                                {conditions.map(cond => (
                                    <button
                                        key={cond}
                                        type="button"
                                        role="radio"
                                        aria-checked={formData.condition === cond}
                                        disabled={loading}
                                        onClick={() => setFormData(prev => ({ ...prev, condition: cond }))}
                                        className={`flex flex-col items-center justify-center py-3 px-1 rounded-xl border transition-all text-[11px] font-bold shadow-sm disabled:opacity-50 ${formData.condition === cond
                                            ? 'border-[#149cb8] bg-[#149cb8]/5 text-[#149cb8] ring-1 ring-[#149cb8]'
                                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#22262a] text-gray-500 hover:border-gray-300'
                                            }`}
                                    >
                                        {cond}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Campus Location */}
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-[#0e191b] dark:text-[#e0e6e8] ml-1" htmlFor="campus">Campus Location</label>
                            <div className="relative">
                                <input
                                    disabled={loading}
                                    className="block w-full rounded-2xl border-0 py-4 px-4 text-[#0e191b] dark:text-[#e0e6e8] shadow-sm bg-white dark:bg-[#22262a] ring-1 ring-inset ring-gray-200 dark:ring-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#149cb8] sm:text-sm sm:leading-6 transition-shadow font-medium disabled:opacity-50"
                                    id="campus"
                                    name="campus"
                                    type="text"
                                    placeholder="e.g. University of Ghana"
                                    value={formData.campus}
                                    onChange={handleChange}
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                                    <DynamicLucideIcon name="location_on" className="text-gray-400" />
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-[#0e191b] dark:text-[#e0e6e8] ml-1" htmlFor="description">Description</label>
                            <textarea
                                required
                                disabled={loading}
                                aria-describedby="char-counter"
                                className="block w-full rounded-2xl border-0 py-4 px-4 text-[#0e191b] dark:text-[#e0e6e8] shadow-sm bg-white dark:bg-[#22262a] ring-1 ring-inset ring-gray-200 dark:ring-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#149cb8] sm:text-sm sm:leading-6 transition-shadow font-medium min-h-[120px] disabled:opacity-50"
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Tell us more about your item..."
                                maxLength={300}
                            />
                            <div className="flex justify-end px-1">
                                <p id="char-counter" aria-live="polite" className="text-xs font-medium text-gray-400">{formData.description.length}/300 characters</p>
                            </div>
                        </div>
                    </section>
                </main>

                {/* Sticky Footer Action */}
                <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/80 dark:bg-[#22262a]/80 backdrop-blur-lg border-t border-gray-100 dark:border-gray-800 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] z-[100]">
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-[#149cb8] hover:bg-[#149cb8]/90 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-[#149cb8]/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Saving...
                            </span>
                        ) : (
                            <>
                                <DynamicLucideIcon name="save" />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
