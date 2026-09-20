'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '../../../utils/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { validateImage, compressImage, generateProfilePicturePath, getFileExtension } from '../../../utils/imageUtils';
import { formatToInternationalPhone, isValidInternationalPhone } from '../../../utils/phoneUtils';
import { getAvatarUrl } from '../../../utils/avatar';
import AvatarPickerModal from '@/components/profile/AvatarPickerModal';

export default function EditProfilePage() {
    const router = useRouter();
    const supabase = createClient();
    const fileInputRef = useRef(null);
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [imagePreview, setImagePreview] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
    const [formData, setFormData] = useState({
        display_name: '',
        username: '',
        bio: '',
        instagram: '',
        snapchat: '',
        phone: '',
        campus: ''
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }
            setUser(user);

            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profileData) {
                setProfile(profileData);
                setFormData({
                    display_name: profileData.display_name || '',
                    username: profileData.username || '',
                    bio: profileData.bio || '',
                    instagram: profileData.instagram || '',
                    snapchat: profileData.snapchat || '',
                    phone: profileData.phone || '',
                    campus: profileData.campus || ''
                });
                setImagePreview(profileData.avatar_url);
            }
            setLoading(false);
        };

        fetchProfile();
    }, [supabase, router]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
        if (success) setSuccess(false);
    };

    const handleImageSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validation = validateImage(file);
        if (!validation.valid) {
            setErrors(prev => ({ ...prev, image: validation.error }));
            return;
        }

        setErrors(prev => ({ ...prev, image: null }));
        setSelectedFile(file);

        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
        if (success) setSuccess(false);
    };

    const handleSelectAdventurerAvatar = (url) => {
        setSelectedFile(null);
        setImagePreview(url);
        if (errors.image) {
            setErrors(prev => ({ ...prev, image: null }));
        }
        if (success) setSuccess(false);
    };

    const uploadProfilePicture = async () => {
        if (!selectedFile || !user) return null;

        setUploading(true);
        try {
            const compressedBlob = await compressImage(selectedFile);
            const fileExt = getFileExtension(selectedFile);
            const filePath = generateProfilePicturePath(user.id, fileExt);

            const { data, error } = await supabase.storage
                .from('profiles')
                .upload(filePath, compressedBlob, {
                    contentType: selectedFile.type,
                    upsert: true
                });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('profiles')
                .getPublicUrl(filePath);

            return { publicUrl, filePath };
        } catch (error) {
            console.error('Error uploading image:', error);
            setErrors(prev => ({ ...prev, image: 'Failed to upload image. Please try again.' }));
            return null;
        } finally {
            setUploading(false);
        }
    };

    const validateForm = async () => {
        const newErrors = {};

        if (!formData.display_name.trim()) {
            newErrors.display_name = 'Full name is required';
        }

        if (!formData.username.trim()) {
            newErrors.username = 'Username is required';
        } else if (formData.username !== profile?.username) {
            const { data: existingUser } = await supabase
                .from('profiles')
                .select('id')
                .eq('username', formData.username)
                .neq('id', user.id)
                .maybeSingle();

            if (existingUser) {
                newErrors.username = 'Username already taken';
            }
        }

        if (formData.phone && formData.phone.trim()) {
            const standardized = formatToInternationalPhone(formData.phone);
            if (!isValidInternationalPhone(standardized)) {
                newErrors.phone = 'Please enter a valid phone number (e.g. 024XXXXXXX or +233...)';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        setSaving(true);
        setSuccess(false);
        try {
            const isValid = await validateForm();
            if (!isValid) {
                setSaving(false);
                return;
            }

            let avatarUrl = profile?.avatar_url;
            let uploadInfo = null;
            if (selectedFile) {
                uploadInfo = await uploadProfilePicture();
                if (uploadInfo) {
                    avatarUrl = uploadInfo.publicUrl;
                } else {
                    setSaving(false);
                    return;
                }
            } else if (imagePreview) {
                avatarUrl = imagePreview;
            }

            const standardizedPhone = formData.phone?.trim()
                ? formatToInternationalPhone(formData.phone)
                : null;
            const phoneChanged = standardizedPhone !== (profile?.phone || null);

            const updatePayload = {
                display_name: formData.display_name,
                username: formData.username,
                bio: formData.bio,
                instagram: formData.instagram,
                snapchat: formData.snapchat,
                phone: standardizedPhone,
                campus: formData.campus,
                avatar_url: avatarUrl,
                updated_at: new Date().toISOString()
            };

            // If phone was changed to a different number, reset verification status
            if (phoneChanged && profile?.phone_verified) {
                updatePayload.phone_verified = false;
            }

            const { error } = await supabase
                .from('profiles')
                .update(updatePayload)
                .eq('id', user.id);

            if (error) throw error;

            // Sync with auth metadata
            await supabase.auth.updateUser({
                data: { full_name: formData.display_name }
            });

            // Success! Safely delete old storage file if user replaced it with a new upload or an Adventurer avatar
            if ((selectedFile || (imagePreview && imagePreview !== profile?.avatar_url)) && profile?.avatar_url) {
                try {
                    if (!profile.avatar_url.includes('api.dicebear.com') && !profile.avatar_url.includes('gravatar.com')) {
                        const oldPath = profile.avatar_url.split('/').slice(-2).join('/');
                        if (oldPath && !oldPath.includes('http')) {
                            await supabase.storage.from('profiles').remove([oldPath]);
                        }
                    }
                } catch (deleteError) {
                    console.error('Non-critical error deleting old avatar:', deleteError);
                }
            }

            setSuccess(true);

            // Re-fetch profile data to update local state (especially avatar_url)
            const { data: updatedProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            if (updatedProfile) setProfile(updatedProfile);

            // Optional: Redirect after a short delay
            setTimeout(() => {
                router.push('/profile');
            }, 2000);

        } catch (error) {
            console.error('Error updating profile:', error);
            setErrors(prev => ({ ...prev, general: 'Failed to save changes. Please try again.' }));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-gray-50 dark:bg-[#242428] font-display text-slate-900 dark:text-white min-h-screen flex flex-col items-center justify-center gap-3">
                <div className="size-10 rounded-full border-[3px] border-gray-200 dark:border-gray-700 border-t-[#1daddd] animate-spin"></div>
                <p className="text-sm font-medium text-slate-400">Loading profile...</p>
            </div>
        );
    }

    const inputBase = "w-full h-12 bg-gray-50 dark:bg-[#162226] border border-gray-200 dark:border-gray-700 focus:border-[#1daddd] focus:ring-1 focus:ring-[#1daddd]/20 rounded-xl pl-11 pr-4 text-sm text-slate-900 dark:text-white font-medium placeholder-slate-400 transition-all outline-none";
    const inputError = "border-red-400 dark:border-red-500 focus:border-red-400 focus:ring-red-400/20";
    const labelClass = "block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide";
    const iconWrapperClass = "absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#1daddd] transition-colors";
    const sectionHeadingClass = "text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5 ml-1";
    const cardClass = "bg-white dark:bg-[#1c2b30] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden";

    return (
        <div className="bg-gray-50 dark:bg-[#242428] font-display text-slate-900 dark:text-white min-h-screen flex flex-col antialiased">
            <main className="flex-1 overflow-y-auto pb-36">
                <div className="max-w-md mx-auto w-full px-5">
                    {/* Header */}
                    <div className="sticky top-0 z-10 bg-gray-50/95 dark:bg-[#242428]/95 backdrop-blur-md pt-4 pb-3">
                        <div className="flex items-center gap-3">
                            <Link
                                href="/profile"
                                className="flex items-center justify-center size-10 rounded-full bg-white dark:bg-[#1c2b30] border border-gray-200 dark:border-gray-700 text-slate-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-[#243438] transition-colors shadow-sm active:scale-95"
                            >
                                <DynamicLucideIcon name="arrow_back" size={20} />
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Edit Profile</h1>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Update your campus presence</p>
                            </div>
                        </div>
                    </div>

                    {/* Alerts */}
                    {errors.general && (
                        <div className="mt-3 p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
                            <DynamicLucideIcon name="error" className="text-red-500 shrink-0 mt-0.5" size={18} />
                            <p className="text-red-600 dark:text-red-400 text-sm font-medium">{errors.general}</p>
                        </div>
                    )}

                    {success && (
                        <div className="mt-3 p-3.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3">
                            <DynamicLucideIcon name="check_circle" className="text-emerald-500 shrink-0" size={18} />
                            <p className="text-emerald-600 dark:text-emerald-400 text-sm font-bold">Profile updated! Redirecting...</p>
                        </div>
                    )}

                    {errors.image && (
                        <div className="mt-3 p-3.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3">
                            <DynamicLucideIcon name="warning" className="text-amber-500 shrink-0 mt-0.5" size={18} />
                            <p className="text-amber-700 dark:text-amber-400 text-sm font-medium">{errors.image}</p>
                        </div>
                    )}

                    {/* Avatar Section */}
                    <section className="flex flex-col items-center pt-6 pb-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            onChange={handleImageSelect}
                            className="hidden"
                        />
                        <div
                            className="relative group cursor-pointer"
                            onClick={() => setIsAvatarPickerOpen(true)}
                        >
                            <div className="size-28 rounded-full p-1 bg-white dark:bg-[#1c2b30] shadow-md border-2 border-dashed border-[#1daddd]/30 group-hover:border-[#1daddd] transition-colors duration-300">
                                <div
                                    className="w-full h-full rounded-full bg-cover bg-center bg-slate-100 dark:bg-slate-800"
                                    style={{ backgroundImage: `url('${imagePreview || getAvatarUrl(profile, user?.id)}')` }}
                                >
                                </div>
                            </div>
                            <div className="absolute bottom-0 right-0 size-8 bg-[#1daddd] text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-[#242428] transform transition-transform group-hover:scale-110">
                                <DynamicLucideIcon name={uploading ? 'progress_activity' : 'camera'} size={16} className={uploading ? 'animate-spin' : ''} />
                            </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                            <button
                                type="button"
                                onClick={() => setIsAvatarPickerOpen(true)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-sky-50 dark:bg-sky-950/50 text-[#1daddd] border border-sky-200 dark:border-sky-800/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-all active:scale-95 cursor-pointer"
                            >
                                <DynamicLucideIcon name="sparkles" size={14} />
                                Choose Avatar
                            </button>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95 cursor-pointer"
                            >
                                <DynamicLucideIcon name="photo_camera" size={14} />
                                Upload Photo
                            </button>
                        </div>
                    </section>

                    {/* Personal Information */}
                    <section className="mt-5">
                        <h3 className={sectionHeadingClass}>Personal Information</h3>
                        <div className={cardClass}>
                            <div className="p-4 space-y-4">
                                {/* Full Name */}
                                <div className="space-y-1.5">
                                    <label className={labelClass}>Full Name</label>
                                    <div className="relative group">
                                        <div className={iconWrapperClass}>
                                            <DynamicLucideIcon name="person" size={18} />
                                        </div>
                                        <input
                                            className={`${inputBase} ${errors.display_name ? inputError : ''}`}
                                            placeholder="Enter your full name"
                                            type="text"
                                            value={formData.display_name}
                                            onChange={(e) => handleInputChange('display_name', e.target.value)}
                                        />
                                    </div>
                                    {errors.display_name && <p className="text-xs text-red-500 font-medium ml-1">{errors.display_name}</p>}
                                </div>

                                {/* Username */}
                                <div className="space-y-1.5">
                                    <label className={labelClass}>Username</label>
                                    <div className="relative group">
                                        <div className={iconWrapperClass}>
                                            <DynamicLucideIcon name="alternate_email" size={18} />
                                        </div>
                                        <input
                                            className={`${inputBase} ${errors.username ? inputError : ''}`}
                                            placeholder="username"
                                            type="text"
                                            value={formData.username}
                                            onChange={(e) => handleInputChange('username', e.target.value)}
                                        />
                                    </div>
                                    {errors.username && <p className="text-xs text-red-500 font-medium ml-1">{errors.username}</p>}
                                </div>

                                {/* Bio */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className={labelClass}>Bio</label>
                                        <span className={`text-[10px] font-medium tabular-nums ${formData.bio.length > 150 ? 'text-amber-500' : 'text-slate-400'}`}>
                                            {formData.bio.length}/200
                                        </span>
                                    </div>
                                    <div className="relative group">
                                        <div className="absolute top-3.5 left-3.5 pointer-events-none text-slate-400 group-focus-within:text-[#1daddd] transition-colors">
                                            <DynamicLucideIcon name="edit_note" size={18} />
                                        </div>
                                        <textarea
                                            className="w-full min-h-[100px] bg-gray-50 dark:bg-[#162226] border border-gray-200 dark:border-gray-700 focus:border-[#1daddd] focus:ring-1 focus:ring-[#1daddd]/20 rounded-xl pl-11 pr-4 py-3.5 text-sm text-slate-900 dark:text-white font-medium placeholder-slate-400 transition-all resize-none outline-none"
                                            placeholder="Tell others about yourself..."
                                            value={formData.bio}
                                            maxLength={200}
                                            onChange={(e) => handleInputChange('bio', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* University & Campus */}
                    <section className="mt-5">
                        <h3 className={sectionHeadingClass}>University</h3>
                        <div className={cardClass}>
                            <div className="p-4 space-y-4">
                                {/* University (locked) */}
                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                        Institution
                                        <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 text-[9px] uppercase font-bold tracking-wider rounded-full">Locked</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            className="w-full h-12 bg-gray-100 dark:bg-[#111b1e] border border-gray-200 dark:border-gray-700/50 rounded-xl px-4 text-sm text-slate-500 dark:text-slate-400 font-medium cursor-not-allowed"
                                            type="text"
                                            value={profile?.university || profile?.campus || 'University not set'}
                                            readOnly
                                        />
                                        <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-slate-400">
                                            <DynamicLucideIcon name="lock" size={16} />
                                        </div>
                                    </div>
                                </div>

                                {/* Campus / Location */}
                                <div className="space-y-1.5">
                                    <label className={labelClass}>Campus / Location</label>
                                    <div className="relative group">
                                        <div className={iconWrapperClass}>
                                            <DynamicLucideIcon name="location_on" size={18} />
                                        </div>
                                        <input
                                            className={inputBase}
                                            placeholder="e.g. Main Campus, City Campus"
                                            type="text"
                                            value={formData.campus}
                                            onChange={(e) => handleInputChange('campus', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Contact Information */}
                    <section className="mt-5">
                        <h3 className={sectionHeadingClass}>Contact Information</h3>
                        <div className={cardClass}>
                            <div className="p-4 space-y-4">
                                {/* Email (locked) */}
                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                        Email Address
                                        <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 text-[9px] uppercase font-bold tracking-wider rounded-full">Locked</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                            <DynamicLucideIcon name="mail" size={18} />
                                        </div>
                                        <input
                                            className="w-full h-12 bg-gray-100 dark:bg-[#111b1e] border border-gray-200 dark:border-gray-700/50 rounded-xl pl-11 pr-4 text-sm text-slate-500 dark:text-slate-400 font-medium cursor-not-allowed"
                                            value={user?.email}
                                            disabled
                                        />
                                    </div>
                                </div>

                                {/* WhatsApp / Phone */}
                                <div className="space-y-1.5">
                                    <label className={labelClass}>WhatsApp / Phone</label>
                                    <div className="relative group">
                                        <div className={iconWrapperClass}>
                                            <DynamicLucideIcon name="call" size={18} />
                                        </div>
                                        <input
                                            className={`${inputBase} ${errors.phone ? inputError : ''}`}
                                            placeholder="e.g. 024 395 3094 or +233..."
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => handleInputChange('phone', e.target.value)}
                                        />
                                    </div>
                                    {errors.phone ? (
                                        <p className="text-xs text-red-500 font-medium ml-1">{errors.phone}</p>
                                    ) : (
                                        <p className="text-[10px] text-slate-400 ml-1">
                                            Saved in international format (+233...) for WhatsApp and SMS
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Social Links */}
                    <section className="mt-5 mb-4">
                        <h3 className={sectionHeadingClass}>Social Links</h3>
                        <div className={cardClass}>
                            <div className="p-4 space-y-4">
                                {/* Instagram */}
                                <div className="space-y-1.5">
                                    <label className={labelClass}>Instagram</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#E1306C] transition-colors">
                                            <DynamicLucideIcon name="photo_camera" size={18} />
                                        </div>
                                        <input
                                            className="w-full h-12 bg-gray-50 dark:bg-[#162226] border border-gray-200 dark:border-gray-700 focus:border-[#E1306C] focus:ring-1 focus:ring-[#E1306C]/20 rounded-xl pl-11 pr-4 text-sm text-slate-900 dark:text-white font-medium placeholder-slate-400 transition-all outline-none"
                                            placeholder="Instagram username"
                                            type="text"
                                            value={formData.instagram}
                                            onChange={(e) => handleInputChange('instagram', e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Snapchat */}
                                <div className="space-y-1.5">
                                    <label className={labelClass}>Snapchat</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#F7D900] transition-colors">
                                            <DynamicLucideIcon name="camera_alt" size={18} />
                                        </div>
                                        <input
                                            className="w-full h-12 bg-gray-50 dark:bg-[#162226] border border-gray-200 dark:border-gray-700 focus:border-[#F7D900] focus:ring-1 focus:ring-[#F7D900]/30 rounded-xl pl-11 pr-4 text-sm text-slate-900 dark:text-white font-medium placeholder-slate-400 transition-all outline-none"
                                            placeholder="Snapchat username"
                                            type="text"
                                            value={formData.snapchat}
                                            onChange={(e) => handleInputChange('snapchat', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </main>

            {/* Fixed Save Button */}
            <div className="fixed bottom-[72px] left-0 right-0 z-50 px-5 py-3 bg-white/95 dark:bg-[#242428]/95 border-t border-gray-100 dark:border-gray-800 backdrop-blur-md">
                <div className="max-w-md mx-auto w-full">
                    <button
                        onClick={handleSave}
                        disabled={saving || uploading}
                        className="w-full h-12 bg-[#1daddd] hover:bg-[#159ac6] active:scale-[0.98] text-white font-bold text-[15px] rounded-xl shadow-lg shadow-[#1daddd]/20 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {saving ? (
                            <>
                                <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Saving...</span>
                            </>
                        ) : uploading ? (
                            <>
                                <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Uploading Photo...</span>
                            </>
                        ) : (
                            <>
                                <span>Save Changes</span>
                                <DynamicLucideIcon name={success ? 'done_all' : 'check'} size={18} />
                            </>
                        )}
                    </button>
                </div>
            </div>

            <AvatarPickerModal
                isOpen={isAvatarPickerOpen}
                onClose={() => setIsAvatarPickerOpen(false)}
                onSelectAvatar={handleSelectAdventurerAvatar}
                initialUrl={imagePreview || getAvatarUrl(profile, user?.id)}
            />
        </div>
    );
}