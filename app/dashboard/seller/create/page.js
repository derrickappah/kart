'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../../utils/supabase/client';
import Link from 'next/link';

export default function CreateListingPage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [imageFiles, setImageFiles] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [subscriptionStatus, setSubscriptionStatus] = useState(null);
    const [checkingSubscription, setCheckingSubscription] = useState(true);

    const [formData, setFormData] = useState({
        title: '',
        price: '',
        category: '',
        condition: 'New',
        description: '',
        campus: '',
    });

    // Check subscription status on mount
    useEffect(() => {
        const checkSubscription = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push('/login');
                    return;
                }

                const { data: allSubscriptions } = await supabase
                    .from('subscriptions')
                    .select('*, plan:subscription_plans(*)')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                const subscription = allSubscriptions?.find(sub =>
                    (sub.status === 'Active' || sub.status === 'active') &&
                    new Date(sub.end_date) > new Date()
                );

                if (subscription) {
                    setSubscriptionStatus('active');
                } else {
                    setSubscriptionStatus('expired');
                }
            } catch (err) {
                setSubscriptionStatus('expired');
            } finally {
                setCheckingSubscription(false);
            }
        };
        checkSubscription();
    }, [router, supabase]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleConditionChange = (condition) => {
        setFormData({ ...formData, condition });
    };

    // Unified handle for file changes
    const handleFileChange = (e, replaceIndex = null) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);

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
                if (remainingSlots <= 0) return;

                const filesToAdd = files.slice(0, remainingSlots);
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

    // Clean up previews on unmount
    useEffect(() => {
        return () => {
            imagePreviews.forEach(url => URL.revokeObjectURL(url));
        };
    }, [imagePreviews]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            if (subscriptionStatus !== 'active') {
                throw new Error('Active subscription required to create listings. Please subscribe first.');
            }

            const uploadedUrls = [];
            let mainImageUrl = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=1000';

            if (imageFiles.length > 0) {
                const uploadPromises = imageFiles.map(async (file) => {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                    const filePath = `${fileName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('products')
                        .upload(filePath, file);

                    if (uploadError) {
                        throw new Error(`Upload failed: ${uploadError.message}`);
                    }

                    const { data: { publicUrl } } = supabase.storage
                        .from('products')
                        .getPublicUrl(filePath);

                    return publicUrl;
                });

                const urls = await Promise.all(uploadPromises);
                uploadedUrls.push(...urls);

                if (urls.length > 0) {
                    mainImageUrl = urls[0];
                }
            }

            const { data: insertData, error: insertError } = await supabase
                .from('products')
                .insert([
                    {
                        seller_id: user.id,
                        title: formData.title,
                        price: parseFloat(formData.price),
                        category: formData.category,
                        condition: formData.condition,
                        description: formData.description,
                        campus: formData.campus || null,
                        image_url: mainImageUrl,
                        images: uploadedUrls,
                        status: 'Active'
                    }
                ])
                .select();

            if (insertError) throw insertError;

            const newProductId = insertData?.[0]?.id;
            router.push(`/dashboard/seller/create/success?id=${newProductId}`);
            router.refresh();

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (checkingSubscription) {
        return (
            <main className="bg-white dark:bg-[#242428] min-h-screen flex items-center justify-center">
                <div className="animate-pulse text-primary font-bold">Checking subscription...</div>
            </main>
        );
    }

    if (subscriptionStatus !== 'active') {
        return (
            <main className="bg-white dark:bg-[#242428] min-h-screen flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-6">
                    <span className="material-symbols-outlined text-4xl">lock</span>
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

    return (
        <main className="bg-white dark:bg-[#242428] font-display text-gray-900 dark:text-white min-h-screen flex flex-col">
            {/* Header */}
            <header className="flex-none px-4 pt-6 pb-2 bg-white dark:bg-[#242428] z-20 sticky top-0 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between h-12 max-w-[430px] mx-auto w-full">
                    <Link href="/dashboard/seller" className="text-base font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                        Cancel
                    </Link>
                    <h1 className="text-lg font-extrabold tracking-tight">List Item</h1>
                </div>
            </header>

            {/* Main Content Area */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto overflow-x-hidden pb-32 relative max-w-[430px] mx-auto w-full">
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
                                    onClick={() => removeImage(index)}
                                    className="absolute top-2 right-2 bg-red-500/90 text-white rounded-full p-1.5 shadow-md hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100 transform translate-y-1 group-hover:translate-y-0"
                                >
                                    <span className="material-symbols-outlined text-[16px]">close</span>
                                </button>

                                <label className="absolute bottom-2 right-2 bg-white/90 dark:bg-[#2E2E32]/90 text-[#111618] dark:text-gray-200 rounded-full p-1.5 shadow-md hover:bg-white dark:hover:bg-[#2E2E32] transition-all opacity-0 group-hover:opacity-100 transform translate-y-1 group-hover:translate-y-0 cursor-pointer border border-gray-100 dark:border-gray-700">
                                    <input type="file" accept="image/*" className="sr-only" onChange={(e) => handleFileChange(e, index)} />
                                    <span className="material-symbols-outlined text-[16px]">sync</span>
                                </label>
                                {index === 0 && (
                                    <div className="absolute bottom-2 left-2 bg-[#1daddd] text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg shadow-sm border border-white/20">
                                        Main Photo
                                    </div>
                                )}
                            </div>
                        ))}

                        {imageFiles.length < 5 && (
                            <label className="cursor-pointer block">
                                <input type="file" accept="image/*" multiple onChange={handleFileChange} className="sr-only" />
                                <div className="aspect-[4/3] w-full rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-[#2E2E32] flex flex-col items-center justify-center gap-2 transition-all duration-300 hover:border-[#1daddd] hover:bg-[#1daddd]/5 active:scale-[0.98]">
                                    <div className="size-10 rounded-full bg-[#1daddd]/10 flex items-center justify-center text-[#1daddd]">
                                        <span className="material-symbols-outlined">add_a_photo</span>
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
                            className="w-full bg-[#F5F5F5] dark:bg-[#2E2E32] border-none rounded-xl px-4 py-4 text-base font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/50 transition-shadow"
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
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                <input
                                    required
                                    className="w-full bg-[#F5F5F5] dark:bg-[#2E2E32] border-none rounded-xl pl-8 pr-4 py-4 text-base font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/50 transition-shadow"
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
                            <div className="relative">
                                <select
                                    required
                                    className="w-full appearance-none bg-[#F5F5F5] dark:bg-[#2E2E32] border-none rounded-xl px-4 py-4 text-base font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/50 transition-shadow pr-10 truncate"
                                    id="category"
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                >
                                    <option disabled value="">Select</option>
                                    <option value="Textbooks">Textbooks</option>
                                    <option value="Electronics">Electronics</option>
                                    <option value="Dorm Furniture">Dorm Furniture</option>
                                    <option value="Clothing">Clothing</option>
                                    <option value="School Supplies">School Supplies</option>
                                    <option value="Tickets & Events">Tickets & Events</option>
                                    <option value="Services & Tutoring">Services & Tutoring</option>
                                    <option value="Beauty & Grooming">Beauty & Grooming</option>
                                    <option value="Sports & Fitness">Sports & Fitness</option>
                                    <option value="Kitchenware">Kitchenware</option>
                                    <option value="Musical Instruments">Musical Instruments</option>
                                    <option value="Games & Consoles">Games & Consoles</option>
                                    <option value="Health & Wellness">Health & Wellness</option>
                                    <option value="Arts & Crafts">Arts & Crafts</option>
                                    <option value="Lost & Found">Lost & Found</option>
                                    <option value="Home Appliances">Home Appliances</option>
                                </select>
                                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xl">expand_more</span>
                            </div>
                        </div>
                    </div>

                    {/* Condition Chips */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 ml-1">Condition</label>
                        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                            {['New', 'Like New', 'Good', 'Fair', 'Poor'].map((cond) => (
                                <button
                                    key={cond}
                                    type="button"
                                    onClick={() => handleConditionChange(cond)}
                                    className={`chip ${formData.condition === cond ? 'chip-active shadow-lg shadow-primary/25' : 'chip-inactive'}`}
                                >
                                    {cond}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Campus Location */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 ml-1" htmlFor="campus">Campus Location</label>
                        <input
                            className="w-full bg-[#F5F5F5] dark:bg-[#2E2E32] border-none rounded-xl px-4 py-4 text-base font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/50 transition-shadow"
                            id="campus"
                            name="campus"
                            placeholder="e.g. University of Ghana"
                            type="text"
                            value={formData.campus}
                            onChange={handleChange}
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2 pb-6">
                        <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 ml-1" htmlFor="description">Description</label>
                        <textarea
                            required
                            className="w-full bg-[#F5F5F5] dark:bg-[#2E2E32] border-none rounded-2xl px-4 py-4 text-base font-normal text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/50 transition-shadow resize-none"
                            id="description"
                            name="description"
                            placeholder="Describe the item details, defects, or preferred pickup location..."
                            rows="5"
                            value={formData.description}
                            onChange={handleChange}
                            maxLength={300}
                        ></textarea>
                        <div className="flex justify-end px-1">
                            <p className="text-xs font-medium text-gray-400">{formData.description.length}/300 characters</p>
                        </div>
                    </div>

                    {/* Campus Context: Meetup Spot Suggestion */}
                    <div className="bg-primary/5 dark:bg-primary/10 rounded-xl p-4 flex items-start gap-3 border border-primary/10 mb-8">
                        <span className="material-symbols-outlined text-primary mt-0.5">location_on</span>
                        <div>
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white">Suggested Meetup</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                                Most students prefer meeting at <span className="text-primary font-semibold">The Campus Library</span> for safe exchanges.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Sticky Bottom Action Bar */}
                <footer className="fixed bottom-0 left-0 right-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-white/90 dark:bg-[#242428]/90 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 z-[100]">
                    <div className="max-w-[430px] mx-auto w-full">
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full h-14 shadow-xl shadow-primary/20"
                        >
                            <span>{loading ? 'Posting...' : 'Post Item'}</span>
                            {!loading && <span className="material-symbols-outlined text-xl">arrow_forward</span>}
                        </button>
                    </div>
                </footer>
            </form>
        </main>
    );
}
