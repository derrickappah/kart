'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '../../../utils/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { validateImage, compressImage, generateProfilePicturePath, getFileExtension } from '../../../utils/imageUtils';

export default function EditProfilePage() {
    const router = useRouter();
    const supabase = createClient();
    const fileInputRef = useRef(null);
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [imagePreview, setImagePreview] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [formData, setFormData] = useState({
        display_name: '',
        username: '',
        bio: '',
        instagram: '',
        linkedin: '',
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
                    linkedin: profileData.linkedin || '',
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
        // Clear error for this field when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
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

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const uploadProfilePicture = async () => {
        if (!selectedFile || !user) return null;

        setUploading(true);
        try {
            // Compress the image
            const compressedBlob = await compressImage(selectedFile);
            const fileExt = getFileExtension(selectedFile);
            const filePath = generateProfilePicturePath(user.id, fileExt);

            // Delete old profile picture if exists
            if (profile?.avatar_url) {
                const oldPath = profile.avatar_url.split('/').slice(-2).join('/');
                await supabase.storage.from('profiles').remove([oldPath]);
            }

            // Upload new image
            const { data, error } = await supabase.storage
                .from('profiles')
                .upload(filePath, compressedBlob, {
                    contentType: selectedFile.type,
                    upsert: true
                });

            if (error) throw error;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('profiles')
                .getPublicUrl(filePath);

            return publicUrl;
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
            // Check username uniqueness
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

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Validate form
            const isValid = await validateForm();
            if (!isValid) {
                setSaving(false);
                return;
            }

            // Upload profile picture if selected
            let avatarUrl = profile?.avatar_url;
            if (selectedFile) {
                const uploadedUrl = await uploadProfilePicture();
                if (uploadedUrl) {
                    avatarUrl = uploadedUrl;
                } else {
                    // If upload failed, don't proceed
                    setSaving(false);
                    return;
                }
            }

            // Update profile
            const { error } = await supabase
                .from('profiles')
                .update({
                    display_name: formData.display_name,
                    username: formData.username,
                    bio: formData.bio,
                    instagram: formData.instagram,
                    linkedin: formData.linkedin,
                    phone: formData.phone,
                    campus: formData.campus,
                    avatar_url: avatarUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (error) throw error;

            // Redirect back to profile page
            router.push('/profile');
        } catch (error) {
            console.error('Error updating profile:', error);
            setErrors(prev => ({ ...prev, general: 'Failed to save changes. Please try again.' }));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-[#f6f7f8] dark:bg-[#111d21] font-body text-slate-900 dark:text-white min-h-screen flex items-center justify-center">
                <div className="animate-pulse text-primary font-bold">Loading...</div>
            </div>
        );
    }

    return (
        <div className="bg-[#f6f7f8] dark:bg-[#111d21] font-body text-slate-900 dark:text-white min-h-screen flex flex-col antialiased">
            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto pb-60">
                <div className="max-w-md mx-auto w-full">
                    {/* Header */}
                    <div className="pt-8 pb-4 text-center space-y-1">
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Profile Settings</h1>
                        <p className="text-slate-500 font-medium">Update your campus presence</p>
                    </div>

                    {/* Error Message */}
                    {errors.general && (
                        <div className="mx-5 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                            <p className="text-red-600 dark:text-red-400 text-sm">{errors.general}</p>
                        </div>
                    )}

                    {/* Profile Avatar Section */}
                    <section className="flex flex-col items-center pt-8 pb-6 px-4">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            onChange={handleImageSelect}
                            className="hidden"
                        />
                        <div
                            className="relative group cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="size-32 rounded-full p-1 bg-white dark:bg-[#1a2c32] shadow-soft">
                                <div
                                    className="w-full h-full rounded-full bg-cover bg-center border-2 border-gray-50 dark:border-gray-800"
                                    style={{ backgroundImage: `url('${imagePreview || profile?.avatar_url || ''}')` }}
                                >
                                    {!imagePreview && !profile?.avatar_url && (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400">
                                            <span className="material-symbols-outlined text-4xl">person</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="absolute bottom-0 right-0 size-9 bg-[#1daddd] text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-[#111d21] transform transition-transform group-hover:scale-110">
                                <span className="material-symbols-outlined text-[20px]">{uploading ? 'hourglass_empty' : 'photo_camera'}</span>
                            </div>
                        </div>
                        <div className="mt-4 text-center">
                            <h3 className="font-bold text-slate-900 dark:text-white">Profile Photo</h3>
                            <p className="text-xs text-slate-500 font-medium mt-1">Tap to change avatar</p>
                        </div>
                    </section>

                    {/* Form Sections */}
                    <section className="px-5 space-y-6">
                        {/* Display Name */}
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Full Name</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#1daddd] transition-colors">
                                    <span className="material-symbols-outlined text-[22px]">person</span>
                                </div>
                                <input
                                    className="w-full h-14 bg-white dark:bg-[#1a2c32] border-transparent focus:border-[#1daddd] focus:ring-0 rounded-xl pl-12 pr-4 text-slate-900 dark:text-white font-medium placeholder-slate-400 shadow-sm transition-all duration-200"
                                    placeholder="Enter your name"
                                    type="text"
                                    value={formData.display_name}
                                    onChange={(e) => handleInputChange('display_name', e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Username */}
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Username</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#1daddd] transition-colors">
                                    <span className="material-symbols-outlined text-[22px]">alternate_email</span>
                                </div>
                                <input
                                    className={`w-full h-14 bg-white dark:bg-[#1a2c32] border-transparent focus:border-[#1daddd] focus:ring-0 rounded-xl pl-12 pr-4 text-slate-900 dark:text-white font-medium shadow-sm transition-all duration-200 ${errors.username ? 'border-red-400 focus:border-red-400' : ''}`}
                                    placeholder="username"
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => handleInputChange('username', e.target.value)}
                                />
                                {errors.username && <p className="mt-1 text-xs text-red-500 font-medium ml-1">{errors.username}</p>}
                            </div>
                        </div>

                        {/* Bio */}
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Bio</label>
                            <div className="relative group">
                                <div className="absolute top-4 left-4 pointer-events-none text-slate-400 group-focus-within:text-[#1daddd] transition-colors">
                                    <span className="material-symbols-outlined text-[22px]">edit_note</span>
                                </div>
                                <textarea
                                    className="w-full min-h-[120px] bg-white dark:bg-[#1a2c32] border-transparent focus:border-[#1daddd] focus:ring-0 rounded-xl pl-12 pr-4 py-4 text-slate-900 dark:text-white font-medium placeholder-slate-400 shadow-sm transition-all duration-200 resize-none"
                                    placeholder="Tell others about yourself..."
                                    value={formData.bio}
                                    onChange={(e) => handleInputChange('bio', e.target.value)}
                                />
                            </div>
                        </div>

                        {/* University (Read-only) */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                                University
                                <span className="px-2 py-0.5 bg-[#1daddd]/10 text-[#1daddd] text-[10px] uppercase font-bold tracking-wider rounded-full border border-[#1daddd]/20">Verified</span>
                            </label>
                            <div className="relative">
                                <input
                                    className="w-full h-14 bg-slate-100 dark:bg-white/5 border-transparent rounded-xl px-4 text-slate-500 dark:text-slate-400 font-medium cursor-not-allowed shadow-inner"
                                    type="text"
                                    value={profile?.university || 'University not set'}
                                    readOnly
                                />
                                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>lock</span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 dark:text-slate-500 px-1">
                                Contact student support to change your university affiliation.
                            </p>
                        </div>

                        {/* Contact Info Group */}
                        <div className="pt-4">
                            <h4 className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500 ml-1 mb-3">Contact Information</h4>
                            <div className="space-y-4">
                                {/* Email (Disabled) */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Email Address</label>
                                    <div className="relative opacity-60">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                            <span className="material-symbols-outlined text-[22px]">mail</span>
                                        </div>
                                        <input
                                            className="w-full h-14 bg-gray-100 dark:bg-[#142328] border-none rounded-xl pl-12 pr-4 text-slate-500 font-medium cursor-not-allowed"
                                            value={user?.email} // Assuming user.email holds the email
                                            disabled
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 ml-1">Email cannot be changed</p>
                                </div>

                                {/* Phone */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">WhatsApp / Phone</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#1daddd] transition-colors">
                                            <span className="material-symbols-outlined text-[22px]">call</span>
                                        </div>
                                        <input
                                            className="w-full h-14 bg-white dark:bg-[#1a2c32] border-transparent focus:border-[#1daddd] focus:ring-0 rounded-xl pl-12 pr-4 text-slate-900 dark:text-white font-medium shadow-sm transition-all duration-200"
                                            placeholder="GHS 233..."
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => handleInputChange('phone', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Location */}
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Campus / Location</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#1daddd] transition-colors">
                                    <span className="material-symbols-outlined text-[22px]">location_on</span>
                                </div>
                                <input
                                    className="w-full h-14 bg-white dark:bg-[#1a2c32] border-transparent focus:border-[#1daddd] focus:ring-0 rounded-xl pl-12 pr-4 text-slate-900 dark:text-white font-medium shadow-sm transition-all duration-200"
                                    placeholder="Your campus"
                                    type="text"
                                    value={formData.campus}
                                    onChange={(e) => handleInputChange('campus', e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Social Links */}
                        <div className="pt-4">
                            <h4 className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500 ml-1 mb-3">Professional Links</h4>
                            {/* Instagram */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Instagram</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#E1306C] transition-colors">
                                        <span className="material-symbols-outlined text-[22px]">photo_camera</span>
                                    </div>
                                    <input
                                        className="w-full h-14 bg-white dark:bg-[#1a2c32] border-transparent focus:border-[#E1306C] focus:ring-0 rounded-xl pl-12 pr-4 text-slate-900 dark:text-white font-medium placeholder-slate-400 shadow-sm transition-all duration-200"
                                        placeholder="Instagram username"
                                        type="text"
                                        value={formData.instagram}
                                        onChange={(e) => handleInputChange('instagram', e.target.value)}
                                    />
                                </div>
                            </div>
                            {/* LinkedIn */}
                            <div className="space-y-2 pb-8">
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">LinkedIn</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#0077b5] transition-colors">
                                        <span className="material-symbols-outlined text-[22px]">work</span>
                                    </div>
                                    <input
                                        className="w-full h-14 bg-white dark:bg-[#1a2c32] border-transparent focus:border-[#0077b5] focus:ring-0 rounded-xl pl-12 pr-4 text-slate-900 dark:text-white font-medium shadow-sm transition-all duration-200"
                                        placeholder="LinkedIn profile URL"
                                        type="text"
                                        value={formData.linkedin}
                                        onChange={(e) => handleInputChange('linkedin', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </main>

            {/* STICKY FOOTER SAVE BUTTON */}
            <div className="fixed bottom-[92px] left-0 right-0 z-50 px-5 py-4 bg-white/95 dark:bg-[#1a2c32]/95 border-t border-gray-100 dark:border-white/5 backdrop-blur-md">
                <div className="max-w-md mx-auto w-full">
                    <button
                        onClick={handleSave}
                        disabled={saving || uploading}
                        className="w-full h-14 bg-primary hover:bg-primary-dark active:scale-[0.98] text-white font-bold text-lg rounded-2xl shadow-lg shadow-primary/25 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <span>{saving ? 'Saving...' : uploading ? 'Uploading...' : 'Save Changes'}</span>
                        <span className="material-symbols-outlined text-[20px]">check</span>
                    </button>
                </div>
            </div>
        </div>
    );
}