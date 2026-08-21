'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function IDReviewPage() {
    const router = useRouter();
    const supabase = createClient();
    const [isEditing, setIsEditing] = useState(false);
    const [isReading, setIsReading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [capturedIDImage, setCapturedIDImage] = useState(null);
    const [capturedFaceImage, setCapturedFaceImage] = useState(null);
    const [error, setError] = useState('');
    const [details, setDetails] = useState({
        fullName: '',
        location: '',
        idNumber: ''
    });

    useEffect(() => {
        const checkStatus = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }

            const [profileRes, requestRes] = await Promise.all([
                supabase
                    .from('profiles')
                    .select('is_verified, verification_status')
                    .eq('id', user.id)
                    .maybeSingle(),
                supabase
                    .from('verification_requests')
                    .select('status')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
            ]);

            const profile = profileRes.data;
            const isVerified = profile?.is_verified || profile?.verification_status === 'Approved';
            const hasPending = requestRes.data && requestRes.data[0]?.status === 'Pending';

            if (isVerified || hasPending) {
                router.push('/dashboard/settings/verify');
            }
        };
        checkStatus();
    }, [router, supabase]);

    useEffect(() => {
        // Retrieve the captured images from sessionStorage
        const storedID = sessionStorage.getItem('capturedIDImage');
        const storedFace = sessionStorage.getItem('capturedFaceImage');

        if (!storedID) {
            router.replace('/dashboard/settings/verify/id-capture');
            return;
        }

        if (!storedFace) {
            router.replace('/dashboard/settings/verify/face-capture');
            return;
        }

        setCapturedIDImage(storedID);
        setCapturedFaceImage(storedFace);

        // Simulate OCR data extraction
        const timer = setTimeout(() => {
            setDetails({
                fullName: '',
                location: '',
                idNumber: ''
            });
            setIsReading(false);
            setIsEditing(true);
        }, 2200);

        return () => clearTimeout(timer);
    }, [router]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setDetails(prev => ({ ...prev, [name]: value }));
        setError('');
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
        if (!details.fullName.trim() || !details.location.trim() || !details.idNumber.trim()) {
            setError('All fields are mandatory.');
            return;
        }
        if (!capturedIDImage || !capturedFaceImage || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            // 1. Upload ID Image to Storage
            const idBlob = dataURLtoBlob(capturedIDImage);
            if (!idBlob) throw new Error('Failed to process student ID image');

            const idFileName = `${user.id}/${Date.now()}_id.jpg`;
            const { error: idUploadError } = await supabase.storage
                .from('verifications')
                .upload(idFileName, idBlob);

            if (idUploadError) throw idUploadError;

            // 2. Upload Face Image to Storage
            const faceBlob = dataURLtoBlob(capturedFaceImage);
            if (!faceBlob) throw new Error('Failed to process face selfie image');

            const faceFileName = `${user.id}/${Date.now()}_face.jpg`;
            const { error: faceUploadError } = await supabase.storage
                .from('verifications')
                .upload(faceFileName, faceBlob);

            if (faceUploadError) throw faceUploadError;

            // 3. Insert into verification_requests
            const { error: insertError } = await supabase
                .from('verification_requests')
                .insert({
                    user_id: user.id,
                    student_id: details.idNumber,
                    student_id_image: idFileName,
                    face_image: faceFileName,
                    status: 'Pending'
                });

            if (insertError) throw insertError;

            // 4. Update profile status
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
            sessionStorage.removeItem('capturedFaceImage');
            router.push('/dashboard/settings/verify/success');
        } catch (error) {
            console.error('Submission error:', error);
            alert('Failed to submit verification: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white dark:bg-[#242428] font-display text-[#111617] dark:text-gray-100 antialiased min-h-screen flex flex-col items-center pt-0 sm:pt-4 transition-colors duration-200">
            <div className="flex flex-col min-h-screen sm:min-h-[850px] w-full max-w-md bg-white dark:bg-[#1a1d23] shadow-2xl relative sm:rounded-[2.5rem] overflow-hidden overflow-y-auto no-scrollbar">

                <div className="flex-1 pb-8">
                    {/* Header Banner */}
                    <div className="px-5 pt-6 pb-2">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider">Verification Review</span>
                        </div>
                        <h2 className="text-[#111617] dark:text-white tracking-tight text-2xl font-black leading-tight">Review Verification Documents</h2>
                        <p className="text-[#647e87] dark:text-gray-400 text-xs font-normal leading-relaxed mt-1">
                            Verify that both your ID card and selfie are sharp and clearly legible.
                        </p>
                    </div>

                    {/* Dual Document Photos Grid */}
                    <div className="px-4 pt-3 grid grid-cols-2 gap-3">
                        {/* ID Document Card */}
                        <div className="bg-white dark:bg-[#23272e] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">
                            <div className="p-2.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <DynamicLucideIcon name="badge" className="text-primary text-xs shrink-0" />
                                    <span className="text-[10px] font-black uppercase tracking-wider text-[#647e87] dark:text-gray-400 truncate">ID Card</span>
                                </div>
                                <button
                                    onClick={() => router.push('/dashboard/settings/verify/id-capture')}
                                    disabled={isSubmitting}
                                    className="text-[9px] font-black text-primary hover:underline uppercase tracking-wider"
                                >
                                    Retake
                                </button>
                            </div>
                            <div className="p-2 flex-1 flex items-center justify-center">
                                <div className="w-full aspect-[1.5/1] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center relative shadow-inner border border-primary/20">
                                    {capturedIDImage ? (
                                        <div
                                            className="w-full h-full bg-center bg-no-repeat bg-cover"
                                            style={{ backgroundImage: `url("${capturedIDImage}")` }}
                                        ></div>
                                    ) : (
                                        <DynamicLucideIcon name="image_not_supported" className="text-gray-400 text-2xl" />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Face Selfie Card */}
                        <div className="bg-white dark:bg-[#23272e] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">
                            <div className="p-2.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <DynamicLucideIcon name="user_check" className="text-primary text-xs shrink-0" />
                                    <span className="text-[10px] font-black uppercase tracking-wider text-[#647e87] dark:text-gray-400 truncate">Face Selfie</span>
                                </div>
                                <button
                                    onClick={() => router.push('/dashboard/settings/verify/face-capture')}
                                    disabled={isSubmitting}
                                    className="text-[9px] font-black text-primary hover:underline uppercase tracking-wider"
                                >
                                    Retake
                                </button>
                            </div>
                            <div className="p-2 flex-1 flex items-center justify-center">
                                <div className="w-full aspect-[1.5/1] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center relative shadow-inner border border-primary/20">
                                    {capturedFaceImage ? (
                                        <div
                                            className="w-full h-full bg-center bg-no-repeat bg-cover"
                                            style={{ backgroundImage: `url("${capturedFaceImage}")` }}
                                        ></div>
                                    ) : (
                                        <DynamicLucideIcon name="image_not_supported" className="text-gray-400 text-2xl" />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Extracted Details Header */}
                    <div className="px-4">
                        <div className="flex items-center justify-between pb-1 pt-6">
                            <h3 className="text-[#111617] dark:text-white tracking-tight text-lg font-black leading-tight">Details</h3>
                            {!isReading && (
                                <button
                                    onClick={handleToggleEdit}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                >
                                    <DynamicLucideIcon name={isEditing ? 'check' : 'edit'} className="text-sm" />
                                    <span className="text-[10px] font-black uppercase tracking-wider">{isEditing ? 'Done' : 'Edit'}</span>
                                </button>
                            )}
                        </div>
                        <p className="text-[#647e87] dark:text-gray-400 text-xs font-normal leading-normal pb-3">
                            {isReading ? "Extracting information from your ID document..." : "Please ensure all details match your physical ID card exactly. All fields are mandatory."}
                        </p>
                    </div>

                    {/* Extracted Details List */}
                    <div className="px-4 space-y-3 relative">
                        {/* Reading Overlay */}
                        {isReading && (
                            <div className="absolute inset-x-4 inset-y-0 z-10 bg-white/70 dark:bg-[#1a1d23]/70 backdrop-blur-[2px] rounded-xl flex flex-col items-center justify-center gap-3 animate-in fade-in duration-300">
                                <div className="flex items-center gap-1">
                                    <div className="size-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="size-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="size-2 bg-primary rounded-full animate-bounce"></div>
                                </div>
                                <p className="text-primary text-xs font-bold uppercase tracking-widest">Reading ID Data</p>
                            </div>
                        )}

                        {/* Name Item */}
                        <div className={`flex items-center gap-3.5 bg-white dark:bg-[#23272e] px-4 min-h-[64px] py-2 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all duration-500 ${!isReading ? 'scale-100 opacity-100' : 'scale-[0.98] opacity-60'}`}>
                            <div className="text-primary flex items-center justify-center rounded-xl bg-primary/10 shrink-0 size-10 shadow-sm">
                                <DynamicLucideIcon name="person" className="text-lg" />
                            </div>
                            <div className="flex flex-col justify-center flex-1">
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="fullName"
                                        value={details.fullName}
                                        onChange={handleChange}
                                        placeholder="Full Name"
                                        className={`bg-gray-50 dark:bg-[#1a1d23] border ${error && !details.fullName.trim() ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-gray-700 focus:ring-primary'} rounded-lg px-2.5 py-1 text-sm font-bold text-[#111617] dark:text-white focus:outline-none focus:ring-1 w-full`}
                                    />
                                ) : (
                                    <p className="text-[#111617] dark:text-white text-sm font-bold leading-normal min-h-[1.25rem]">{details.fullName || (isReading ? "Analyzing..." : "Not found")}</p>
                                )}
                            </div>
                        </div>

                        {/* Location Item */}
                        <div className={`flex items-center gap-3.5 bg-white dark:bg-[#23272e] px-4 min-h-[64px] py-2 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all duration-500 delay-75 ${!isReading ? 'scale-100 opacity-100' : 'scale-[0.98] opacity-60'}`}>
                            <div className="text-primary flex items-center justify-center rounded-xl bg-primary/10 shrink-0 size-10 shadow-sm">
                                <DynamicLucideIcon name="location_on" className="text-lg" />
                            </div>
                            <div className="flex flex-col justify-center flex-1">
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="location"
                                        value={details.location}
                                        onChange={handleChange}
                                        placeholder="Campus / Location"
                                        className={`bg-gray-50 dark:bg-[#1a1d23] border ${error && !details.location.trim() ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-gray-700 focus:ring-primary'} rounded-lg px-2.5 py-1 text-sm font-bold text-[#111617] dark:text-white focus:outline-none focus:ring-1 w-full`}
                                    />
                                ) : (
                                    <p className="text-[#111617] dark:text-white text-sm font-bold leading-normal line-clamp-1 min-h-[1.25rem]">{details.location || (isReading ? "Analyzing..." : "Not found")}</p>
                                )}
                            </div>
                        </div>

                        {/* ID Number Item */}
                        <div className={`flex items-center gap-3.5 bg-white dark:bg-[#23272e] px-4 min-h-[64px] py-2 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all duration-500 delay-150 ${!isReading ? 'scale-100 opacity-100' : 'scale-[0.98] opacity-60'}`}>
                            <div className="text-primary flex items-center justify-center rounded-xl bg-primary/10 shrink-0 size-10 shadow-sm">
                                <DynamicLucideIcon name="credit_card" className="text-lg" />
                            </div>
                            <div className="flex flex-col justify-center flex-1">
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="idNumber"
                                        value={details.idNumber}
                                        onChange={handleChange}
                                        placeholder="ID Number"
                                        className={`bg-gray-50 dark:bg-[#1a1d23] border ${error && !details.idNumber.trim() ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-gray-700 focus:ring-primary'} rounded-lg px-2.5 py-1 text-sm font-bold text-[#111617] dark:text-white focus:outline-none focus:ring-1 w-full`}
                                    />
                                ) : (
                                    <p className="text-[#111617] dark:text-white text-sm font-bold leading-normal min-h-[1.25rem]">{details.idNumber || (isReading ? "Analyzing..." : "Not found")}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Reassurance Note */}
                    <div className="px-5 py-3.5 flex items-start gap-2.5 bg-primary/5 mx-4 mt-5 rounded-2xl border border-primary/10 shadow-sm">
                        <DynamicLucideIcon name="verified_user" className="text-primary text-lg shrink-0 mt-0.5" />
                        <p className="text-primary text-xs font-bold leading-relaxed">Your data and photos are securely encrypted and used strictly for verification.</p>
                    </div>
                </div>

                {/* Bottom Actions */}
                <div className="p-4 bg-white dark:bg-[#1a1d23] border-t border-gray-100 dark:border-gray-800 flex flex-col gap-2.5">
                    {error && (
                        <div className="text-red-500 text-xs font-bold flex items-center justify-center gap-1.5 py-2.5 px-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl animate-in fade-in duration-200">
                            <DynamicLucideIcon name="warning" className="text-sm text-red-500" />
                            <span>{error}</span>
                        </div>
                    )}
                    <button
                        onClick={handleSubmit}
                        disabled={isReading || isSubmitting}
                        className={`w-full h-14 rounded-2xl font-black text-base active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg ${(isReading || isSubmitting) ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-primary text-white hover:bg-[#159ac6] shadow-primary/25'}`}
                    >
                        {isSubmitting ? (
                            <>
                                <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>Submitting Verification...</span>
                            </>
                        ) : (
                            <>
                                <span>{isReading ? "Please Wait..." : "Submit for Verification"}</span>
                                {!isReading && <DynamicLucideIcon name="arrow_forward" />}
                            </>
                        )}
                    </button>
                    <button
                        onClick={() => router.push('/dashboard/settings/verify/face-capture')}
                        disabled={isSubmitting}
                        className="w-full h-12 bg-gray-100 dark:bg-[#23272e] text-[#111617] dark:text-white rounded-xl font-bold text-xs hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                        <DynamicLucideIcon name="photo_camera" className="text-base" />
                        <span>Retake Face Selfie</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
