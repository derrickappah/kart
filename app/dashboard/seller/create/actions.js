'use server';

import { createClient, createServiceRoleClient } from '@/utils/supabase/server';

/**
 * Server Action to create a seller product listing.
 * Handles server-side auth, subscription & verification validation,
 * server-to-server image uploading to Supabase Storage, and database insertion.
 * 
 * @param {Object} listingData
 * @returns {Promise<{ success: boolean, productId?: string, error?: string }>}
 */
export async function createListingAction(listingData) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return { success: false, error: 'You must be logged in to create a listing.' };
        }

        const {
            title = '',
            price,
            category = '',
            condition = 'New',
            description = '',
            campus = '',
            images = []
        } = listingData || {};

        // 1. Verify seller permissions on server
        const [subsRes, profileRes] = await Promise.all([
            supabase
                .from('subscriptions')
                .select('status, end_date')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false }),
            supabase
                .from('profiles')
                .select('is_verified, verification_status')
                .eq('id', user.id)
                .single()
        ]);

        const activeSub = subsRes.data?.find(sub =>
            (sub.status === 'Active' || sub.status === 'active') &&
            new Date(sub.end_date) > new Date()
        );

        if (!activeSub) {
            return { success: false, error: 'Active subscription required to create listings. Please subscribe first.' };
        }

        const isVerified = profileRes.data?.is_verified || profileRes.data?.verification_status === 'Approved';
        if (!isVerified) {
            return { success: false, error: 'Seller verification required to create listings. Please get verified first.' };
        }

        // 2. Validate form fields
        const titleTrimmed = (title || '').trim();
        const descriptionTrimmed = (description || '').trim();
        const campusTrimmed = (campus || '').trim();
        const categoryTrimmed = (category || '').trim();
        const conditionTrimmed = (condition || 'New').trim();

        if (titleTrimmed.length < 3) {
            return { success: false, error: 'Title must be at least 3 characters long' };
        }
        if (descriptionTrimmed.length < 10) {
            return { success: false, error: 'Description must be at least 10 characters long' };
        }

        const priceNum = parseFloat(price);
        if (isNaN(priceNum) || priceNum < 0) {
            return { success: false, error: 'Price must be a non-negative number' };
        }
        if (priceNum > 1000000) {
            return { success: false, error: 'Price cannot exceed ₵1,000,000' };
        }

        if (!categoryTrimmed) {
            return { success: false, error: 'Please select a category' };
        }

        // 3. Upload images to Supabase storage server-side
        const serviceClient = createServiceRoleClient();
        const uploadedUrls = [];
        const uploadedPaths = [];

        if (Array.isArray(images) && images.length > 0) {
            for (let i = 0; i < images.length; i++) {
                const item = images[i];
                let base64String = typeof item === 'string' ? item : (item.dataUrl || item.rawBase64 || item.base64);
                if (!base64String) continue;

                let contentType = 'image/jpeg';
                let ext = 'jpg';

                if (base64String.includes(',')) {
                    const parts = base64String.split(',');
                    const mimeMatch = parts[0].match(/:(.*?);/);
                    if (mimeMatch) contentType = mimeMatch[1];
                    base64String = parts[1];
                }

                if (contentType.includes('webp')) ext = 'webp';
                else if (contentType.includes('png')) ext = 'png';

                const buffer = Buffer.from(base64String, 'base64');
                const fileName = `${user.id}-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}.${ext}`;

                const { error: uploadErr } = await serviceClient.storage
                    .from('products')
                    .upload(fileName, buffer, {
                        contentType,
                        upsert: true,
                        cacheControl: '31536000'
                    });

                if (uploadErr) {
                    console.error('[createListingAction] Image upload error:', uploadErr);
                    // Clean up partially uploaded files
                    if (uploadedPaths.length > 0) {
                        await serviceClient.storage.from('products').remove(uploadedPaths).catch(() => {});
                    }
                    return { success: false, error: `Failed to upload image ${i + 1}: ${uploadErr.message}` };
                }

                uploadedPaths.push(fileName);

                const { data: { publicUrl } } = serviceClient.storage
                    .from('products')
                    .getPublicUrl(fileName);

                uploadedUrls.push(publicUrl);
            }
        }

        let mainImageUrl = uploadedUrls.length > 0
            ? uploadedUrls[0]
            : 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=1000';

        // 4. Insert listing record into products table
        const { data: insertData, error: insertError } = await supabase
            .from('products')
            .insert([
                {
                    seller_id: user.id,
                    title: titleTrimmed,
                    price: priceNum,
                    category: categoryTrimmed,
                    condition: conditionTrimmed,
                    description: descriptionTrimmed,
                    campus: campusTrimmed || null,
                    image_url: mainImageUrl,
                    images: uploadedUrls,
                    status: 'Active'
                }
            ])
            .select();

        if (insertError) {
            console.error('[createListingAction] DB insert error:', insertError);
            if (uploadedPaths.length > 0) {
                await serviceClient.storage.from('products').remove(uploadedPaths).catch(() => {});
            }
            return { success: false, error: insertError.message || 'Failed to save listing to database' };
        }

        const newProductId = insertData?.[0]?.id;
        return { success: true, productId: newProductId };
    } catch (err) {
        console.error('[createListingAction] Unexpected exception:', err);
        return { success: false, error: err.message || 'An unexpected error occurred while creating the listing' };
    }
}
