'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function IDReviewPage() {
    const router = useRouter();
    const supabase = createClient();
    const [isEditing, setIsEditing] = useState(false);
    const [isReading, setIsReading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [capturedImage, setCapturedImage] = useState(null);
    const [details, setDetails] = useState({
        fullName: '',
        university: '',
        idNumber: ''
    });

    useEffect(() => {
        // Retrieve the captured image from sessionStorage
        const storedImage = sessionStorage.getItem('capturedIDImage');
        if (storedImage) {
            setCapturedImage(storedImage);

            // Simulate OCR data extraction
            const timer = setTimeout(() => {
                setDetails({
                    fullName: 'Alex Johnson',
                    university: 'State University of Technology',
                    idNumber: '88291044'
                });
                setIsReading(false);
            }, 2500);

            return () => clearTimeout(timer);
        } else {
            // No image found, stop reading state
            setIsReading(false);
        }
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setDetails(prev => ({ ...prev, [name]: value }));
    };

    const handleToggleEdit = () => {
        setIsEditing(!isEditing);
    };

    // Helper to convert data URL to Blob
    const dataURLtoBlob = (dataurl) => {
        try {
            let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
                bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            return new Blob([u8arr], { type: mime });
        } catch (e) {
            console.error("Error converting dataURL to Blob:", e);
            return null;
        }
    };

    const handleSubmit = async () => {
        if (!capturedImage || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            // 1. Upload Image to Storage
            const blob = dataURLtoBlob(capturedImage);
            if (!blob) throw new Error('Failed to process image');

            const fileName = `${user.id}/${Date.now()}.jpg`;

            const { error: uploadError } = await supabase.storage
                .from('verifications')
                .upload(fileName, blob);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('verifications')
                .getPublicUrl(fileName);

            // 2. Insert into verification_requests
            const { error: insertError } = await supabase
                .from('verification_requests')
                .insert({
                    user_id: user.id,
                    student_id: details.idNumber,
                    student_id_image: publicUrl,
                    status: 'Pending'
                });

            if (insertError) throw insertError;

            // 3. Update profile status
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    verification_status: 'Pending',
                    student_id: details.idNumber
                })
                .eq('id', user.id);

            if (profileError) throw profileError;

            // Success! Clean up and navigate
            sessionStorage.removeItem('capturedIDImage');
            router.push('/dashboard/settings/verify/success');
        } catch (error) {
            console.error('Submission error:', error);
            alert('Failed to submit verification: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-[#f6f7f8] dark:bg-[#111d21] font-display text-[#111617] dark:text-gray-100 antialiased min-h-screen flex flex-col items-center pt-0 sm:pt-4 transition-colors duration-200">
            <div className="flex flex-col min-h-screen sm:min-h-[800px] w-full max-w-md bg-white dark:bg-[#1a1d23] shadow-2xl relative sm:rounded-[2.5rem] overflow-hidden overflow-y-auto no-scrollbar">

                <div className="flex-1 pb-8">
                    {/* ID Photo Card Section */}
                    <div className="px-4 pt-4">
                        <div className="bg-white dark:bg-[#23272e] rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                            <div className="p-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-sm">badge</span>
                                <span className="text-xs font-semibold uppercase tracking-wider text-[#647e87]">Captured ID Document</span>
                            </div>
                            <div className="flex w-full p-3">
                                <div className="w-full aspect-[1.6/1] rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center relative shadow-inner">
                                    {capturedImage ? (
                                        <div
                                            className="w-full h-full bg-center bg-no-repeat bg-cover transition-transform duration-700 hover:scale-105"
                                            style={{ backgroundImage: `url("${capturedImage}")` }}
                                        ></div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-gray-400 gap-2">
                                            <span className="material-symbols-outlined text-4xl">image_not_supported</span>
                                            <p className="text-xs font-medium">No image captured</p>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-primary/5 pointer-events-none border-2 border-primary/20 rounded-lg"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Header Text */}
                    <div className="px-4">
                        <div className="flex items-center justify-between pb-1 pt-8">
                            <h3 className="text-[#111617] dark:text-white tracking-tight text-2xl font-bold leading-tight">Review Your Details</h3>
                            {!isReading && (
                                <button
                                    onClick={handleToggleEdit}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-lg">{isEditing ? 'check' : 'edit'}</span>
                                    <span className="text-xs font-bold uppercase tracking-wider">{isEditing ? 'Done' : 'Edit'}</span>
                                </button>
                            )}
                        </div>
                        <p className="text-[#647e87] dark:text-gray-400 text-base font-normal leading-normal pb-4">
                            {isReading ? "Extracting information from your ID document..." : "Please ensure all details match your physical ID card exactly."}
                        </p>
                    </div>

                    {/* Extracted Details List */}
                    <div className="px-4 space-y-3 relative">
                        {/* Reading Overlay */}
                        {isReading && (
                            <div className="absolute inset-x-4 inset-y-0 z-10 bg-white/60 dark:bg-[#1a1d23]/60 backdrop-blur-[2px] rounded-xl flex flex-col items-center justify-center gap-3 animate-in fade-in duration-300">
                                <div className="flex items-center gap-1">
                                    <div className="size-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="size-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="size-2 bg-primary rounded-full animate-bounce"></div>
                                </div>
                                <p className="text-primary text-xs font-bold uppercase tracking-widest">Reading ID Data</p>
                            </div>
                        )}

                        {/* Name Item */}
                        <div className={`flex items-center gap-4 bg-white dark:bg-[#23272e] px-4 min-h-[72px] py-2 rounded-xl border border-gray-50 dark:border-gray-800 shadow-sm transition-all duration-500 ${!isReading && details.fullName ? 'scale-100 opacity-100' : 'scale-[0.98] opacity-60'}`}>
                            <div className="text-primary flex items-center justify-center rounded-lg bg-primary/10 shrink-0 size-12 shadow-sm">
                                <span className="material-symbols-outlined">person</span>
                            </div>
                            <div className="flex flex-col justify-center flex-1">
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="fullName"
                                        value={details.fullName}
                                        onChange={handleChange}
                                        className="bg-gray-50 dark:bg-[#1a1d23] border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 text-sm font-bold text-[#111617] dark:text-white focus:outline-none focus:ring-1 focus:ring-primary w-full"
                                    />
                                ) : (
                                    <p className="text-[#111617] dark:text-white text-base font-bold leading-normal min-h-[1.5rem]">{details.fullName || (isReading ? "Analyzing..." : "Not found")}</p>
                                )}
                                <p className="text-[#647e87] dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">Full Name</p>
                            </div>
                        </div>

                        {/* University Item */}
                        <div className={`flex items-center gap-4 bg-white dark:bg-[#23272e] px-4 min-h-[72px] py-2 rounded-xl border border-gray-50 dark:border-gray-800 shadow-sm transition-all duration-500 delay-75 ${!isReading && details.university ? 'scale-100 opacity-100' : 'scale-[0.98] opacity-60'}`}>
                            <div className="text-primary flex items-center justify-center rounded-lg bg-primary/10 shrink-0 size-12 shadow-sm">
                                <span className="material-symbols-outlined">school</span>
                            </div>
                            <div className="flex flex-col justify-center flex-1">
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="university"
                                        value={details.university}
                                        onChange={handleChange}
                                        className="bg-gray-50 dark:bg-[#1a1d23] border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 text-sm font-bold text-[#111617] dark:text-white focus:outline-none focus:ring-1 focus:ring-primary w-full"
                                    />
                                ) : (
                                    <p className="text-[#111617] dark:text-white text-sm font-bold leading-normal line-clamp-1 min-h-[1.25rem]">{details.university || (isReading ? "Analyzing..." : "Not found")}</p>
                                )}
                                <p className="text-[#647e87] dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">University</p>
                            </div>
                        </div>

                        {/* ID Number Item */}
                        <div className={`flex items-center gap-4 bg-white dark:bg-[#23272e] px-4 min-h-[72px] py-2 rounded-xl border border-gray-50 dark:border-gray-800 shadow-sm transition-all duration-500 delay-150 ${!isReading && details.idNumber ? 'scale-100 opacity-100' : 'scale-[0.98] opacity-60'}`}>
                            <div className="text-primary flex items-center justify-center rounded-lg bg-primary/10 shrink-0 size-12 shadow-sm">
                                <span className="material-symbols-outlined">pin</span>
                            </div>
                            <div className="flex flex-col justify-center flex-1">
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="idNumber"
                                        value={details.idNumber}
                                        onChange={handleChange}
                                        className="bg-gray-50 dark:bg-[#1a1d23] border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 text-sm font-bold text-[#111617] dark:text-white focus:outline-none focus:ring-1 focus:ring-primary w-full"
                                    />
                                ) : (
                                    <p className="text-[#111617] dark:text-white text-base font-bold leading-normal min-h-[1.5rem]">{details.idNumber || (isReading ? "Analyzing..." : "Not found")}</p>
                                )}
                                <p className="text-[#647e87] dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">Student ID Number</p>
                            </div>
                        </div>
                    </div>

                    {/* Reassurance Note */}
                    <div className="px-6 py-4 flex items-start gap-3 bg-primary/5 mx-4 mt-6 rounded-2xl border border-primary/10 shadow-sm">
                        <span className="material-symbols-outlined text-primary text-xl">verified_user</span>
                        <p className="text-primary text-xs font-bold leading-tight">Your data is encrypted and used only for marketplace trust verification.</p>
                    </div>
                </div>

                {/* Bottom Actions */}
                <div className="p-4 bg-white dark:bg-[#1a1d23] border-t border-gray-100 dark:border-gray-800 flex flex-col gap-3">
                    <button
                        onClick={handleSubmit}
                        disabled={isReading || isSubmitting}
                        className={`w-full h-14 rounded-xl font-bold text-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg ${(isReading || isSubmitting) ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-primary text-white hover:bg-[#159ac6] shadow-primary/25'}`}
                    >
                        {isSubmitting ? (
                            <>
                                <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>Submitting...</span>
                            </>
                        ) : (
                            <>
                                <span>{isReading ? "Please Wait..." : "Submit for Verification"}</span>
                                {!isReading && <span className="material-symbols-outlined">arrow_forward</span>}
                            </>
                        )}
                    </button>
                    <button
                        onClick={() => router.back()}
                        disabled={isSubmitting}
                        className="w-full h-14 bg-gray-100 dark:bg-[#23272e] text-[#111617] dark:text-white rounded-xl font-bold text-base hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined text-xl">photo_camera</span>
                        <span>Retake Photo</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
