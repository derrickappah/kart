'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../utils/supabase/client';
import Link from 'next/link';
import { signout } from '../../../auth/actions';

export default function VerificationPage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [fetchingStatus, setFetchingStatus] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [verificationStatus, setVerificationStatus] = useState(null);
    const [formData, setFormData] = useState({
        studentId: '',
        studentIdImage: null,
    });
    const [userProfile, setUserProfile] = useState(null);

    // Fetch user profile and verification status
    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push('/login');
                    return;
                }

                // Fetch user profile
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                
                setUserProfile({
                    ...user,
                    profile: profile
                });

                // Get the most recent verification request
                const { data: requests, error: reqError } = await supabase
                    .from('verification_requests')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (reqError) {
                    console.error('Error fetching verification status:', reqError);
                    return;
                }

                if (requests && requests.length > 0) {
                    setVerificationStatus(requests[0]);
                }
            } catch (err) {
                console.error('Error in fetchData:', err);
            } finally {
                setFetchingStatus(false);
            }
        };

        fetchData();
    }, [supabase, router]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = async (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
                setError('Please log in first');
                return;
            }

            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-student-id-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('products')
                .upload(fileName, file);

            if (uploadError) {
                setError('Failed to upload image');
                return;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('products')
                .getPublicUrl(fileName);

            setFormData({ ...formData, studentIdImage: publicUrl });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            if (!formData.studentId || !formData.studentIdImage) {
                throw new Error('Please fill in all fields');
            }

            const response = await fetch('/api/verification/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId: formData.studentId,
                    studentIdImage: formData.studentIdImage,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to submit verification request');
            }

            setSuccess(true);
            
            // Refresh verification status
            const { data: requests } = await supabase
                .from('verification_requests')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1);
            
            if (requests && requests.length > 0) {
                setVerificationStatus(requests[0]);
            }
            setTimeout(() => {
                router.refresh();
            }, 2000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const displayName = userProfile?.user_metadata?.full_name || userProfile?.profile?.display_name || userProfile?.email?.split('@')[0] || 'User';
    const role = 'Seller';
    const initials = displayName && displayName.length > 0
        ? displayName
            .split(' ')
            .map(n => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase()
        : 'U';

    return (
        <div className="bg-[#f6f7f8] dark:bg-[#131d1f] min-h-screen font-display antialiased">
            <div className="relative flex min-h-screen w-full flex-col max-w-md mx-auto bg-[#f6f7f8] dark:bg-[#131d1f] shadow-2xl overflow-hidden pb-20">
                {/* Header */}
                <header className="px-6 pt-10 pb-6 flex items-center justify-between sticky top-0 bg-[#f6f7f8]/90 dark:bg-[#131d1f]/90 backdrop-blur-md z-10 border-b border-gray-100 dark:border-gray-800">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Verification</h1>
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Get verified to sell</p>
                    </div>
                    <Link href="/dashboard/seller" className="size-10 rounded-xl bg-white dark:bg-white/5 shadow-soft border border-transparent dark:border-white/5 flex items-center justify-center text-slate-400 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-xl">close</span>
                    </Link>
                </header>

                <main className="flex-1 px-6 py-8 space-y-8">
                    {fetchingStatus ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#1e292b] rounded-3xl shadow-soft border border-transparent dark:border-white/5 space-y-4">
                            <div className="size-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                            <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Checking status...</p>
                        </div>
                    ) : verificationStatus?.status === 'Approved' ? (
                        <div className="bg-emerald-500/10 dark:bg-emerald-500/5 ring-1 ring-emerald-500/20 p-8 rounded-3xl shadow-sm text-center space-y-6">
                            <div className="size-20 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                                <span className="material-symbols-outlined text-4xl font-bold">verified</span>
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-tight">Profile Verified</h2>
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                                    Your seller verification has been approved! You now have full access to KART's selling features.
                                </p>
                            </div>
                            <Link href="/dashboard/seller" className="h-12 w-full flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]">
                                Start Selling
                            </Link>
                        </div>
                    ) : verificationStatus?.status === 'Pending' ? (
                        <div className="bg-amber-500/10 dark:bg-amber-500/5 ring-1 ring-amber-500/20 p-8 rounded-3xl shadow-sm text-center space-y-6">
                            <div className="size-20 bg-amber-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
                                <span className="material-symbols-outlined text-4xl font-bold">pending_actions</span>
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-amber-600 dark:text-amber-500 uppercase tracking-tight">Review in Progress</h2>
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                                    Your verification request is currently being reviewed by our team. This usually takes 24-48 hours.
                                </p>
                            </div>
                            <div className="pt-4 border-t border-amber-500/10 text-[10px] font-bold text-amber-600/60 dark:text-amber-500/40 uppercase tracking-widest text-center">
                                Submitted {new Date(verificationStatus.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {verificationStatus?.status === 'Rejected' && (
                                <div className="bg-red-500/10 dark:bg-red-500/5 ring-1 ring-red-500/20 p-5 rounded-2xl space-y-3">
                                    <div className="flex items-center gap-2 text-red-600 dark:text-red-500">
                                        <span className="material-symbols-outlined text-lg font-bold">error</span>
                                        <h3 className="text-xs font-black uppercase tracking-wider">Previous Request Rejected</h3>
                                    </div>
                                    {verificationStatus.admin_notes && (
                                        <p className="text-[11px] font-medium text-red-500/80 leading-relaxed">
                                            <span className="font-bold">Reason:</span> {verificationStatus.admin_notes}
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="bg-white dark:bg-[#1e292b] p-6 rounded-3xl shadow-soft border border-transparent dark:border-white/5 space-y-6">
                                <section className="space-y-4">
                                    <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Verify Your Identity</h3>
                                    
                                    <form onSubmit={handleSubmit} className="space-y-5">
                                        {error && (
                                            <div className="bg-red-500/10 text-red-500 p-3 rounded-xl text-[10px] font-bold uppercase tracking-wider text-center">
                                                {error}
                                            </div>
                                        )}

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Student ID Number</label>
                                            <input
                                                type="text"
                                                name="studentId"
                                                required
                                                className="w-full bg-slate-50 dark:bg-white/5 border border-transparent dark:border-white/5 rounded-xl py-3.5 px-4 text-sm font-bold focus:ring-2 focus:ring-primary transition-all focus:bg-white"
                                                placeholder="e.g. 202412345"
                                                value={formData.studentId}
                                                onChange={handleChange}
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Student ID Photo</label>
                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleFileChange}
                                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                />
                                                <div className="w-full bg-slate-50 dark:bg-white/5 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl py-8 flex flex-col items-center justify-center gap-2 group hover:border-primary/50 transition-colors">
                                                    <span className="material-symbols-outlined text-3xl text-slate-300 dark:text-slate-600 group-hover:text-primary transition-colors">add_a_photo</span>
                                                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                                        {formData.studentIdImage ? 'Change Photo' : 'Upload ID Photo'}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            {formData.studentIdImage && (
                                                <div className="mt-4 rounded-xl overflow-hidden shadow-md ring-1 ring-black/5">
                                                    <img src={formData.studentIdImage} alt="ID Preview" className="w-full h-auto" />
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full h-14 flex items-center justify-center bg-primary hover:bg-primary-dark text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
                                        >
                                            {loading ? (
                                                <div className="size-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                            ) : (
                                                'Submit Verification'
                                            )}
                                        </button>
                                    </form>
                                </section>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
