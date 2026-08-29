'use server';

import { createClient, createServiceRoleClient } from '@/utils/supabase/server';

/**
 * Server Action to update a seller product listing.
 * 
 * @param {string} productId
 * @param {Object} listingData
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function updateListingAction(productId, listingData) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return { success: false, error: 'You must be logged in to update a listing.' };
        }

        const {
            title = '',
            price,
            category = '',
            condition = 'Good',
            description = '',
            campus = '',
            photos = []
        } = listingData || {};

        // Verify product ownership
        const { data: existing, error: fetchErr } = await supabase
            .from('products')
            .select('id, seller_id')
            .eq('id', productId)
            .single();

        if (fetchErr || !existing || existing.seller_id !== user.id) {
            return { success: false, error: 'Listing not found or you do not have permission to edit it.' };
        }

        const titleTrimmed = (title || '').trim();
        const descriptionTrimmed = (description || '').trim();
        const campusTrimmed = (campus || '').trim();
        const categoryTrimmed = (category || '').trim();
        const conditionTrimmed = (condition || 'Good').trim();

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

        const serviceClient = createServiceRoleClient();
        const updatedUrls = [];

        for (let i = 0; i < (photos || []).length; i++) {
            const photo = photos[i];
            if (photo.type === 'remote' && photo.url) {
                updatedUrls.push(photo.url);
            } else if (photo.type === 'local' && (photo.dataUrl || photo.base64)) {
                let base64String = photo.dataUrl || photo.base64;
                let contentType = 'image/jpeg';
                let ext = 'jpg';

                if (base64String.includes(',')) {
                    const parts = base64String.split(',');
                    const mimeMatch = parts[0].match(/:(.*?);/);
                    if (mimeMatch) contentType = mimeMatch[1];
                    base64String = parts[1];
                }

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
                    console.error('[updateListingAction] Image upload error:', uploadErr);
                    return { success: false, error: `Failed to upload image: ${uploadErr.message}` };
                }

                const { data: { publicUrl } } = serviceClient.storage
                    .from('products')
                    .getPublicUrl(fileName);

                updatedUrls.push(publicUrl);
            }
        }

        let mainImageUrl = updatedUrls.length > 0
            ? updatedUrls[0]
            : 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=1000';

        const { error: updateError } = await supabase
            .from('products')
            .update({
                title: titleTrimmed,
                price: priceNum,
                category: categoryTrimmed,
                condition: conditionTrimmed,
                description: descriptionTrimmed,
                campus: campusTrimmed || null,
                image_url: mainImageUrl,
                images: updatedUrls
            })
            .eq('id', productId);

        if (updateError) {
            console.error('[updateListingAction] DB update error:', updateError);
            return { success: false, error: updateError.message || 'Failed to update listing' };
        }

        return { success: true };
    } catch (err) {
        console.error('[updateListingAction] Unexpected error:', err);
        return { success: false, error: err.message || 'An unexpected error occurred while updating the listing' };
    }
}
