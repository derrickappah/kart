'use server';

import { createClient, createServiceRoleClient } from '@/utils/supabase/server';

/**
 * Server Action to create a seller product listing.
 * Handles server-side auth, subscription & verification validation,
 * server-to-server image uploading to Supabase Storage, and database insertion.
 * 
 * @param {Object} listingData
 * @returns {Promise<{ success: boolean, productId?: string, error?: string, debug?: string }>}
 */
export async function createListingAction(listingData) {
    const debugLog = [];
    
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return { success: false, error: 'You must be logged in to create a listing.' };
        }

        debugLog.push(`User: ${user.id}`);

        const {
            title = '',
            price,
            category = '',
            condition = 'New',
            description = '',
            campus = '',
            images = []
        } = listingData || {};

        debugLog.push(`Received listingData keys: ${Object.keys(listingData || {}).join(', ')}`);
        debugLog.push(`Images field type: ${typeof images}`);
        debugLog.push(`Images is array: ${Array.isArray(images)}`);
        debugLog.push(`Images length: ${Array.isArray(images) ? images.length : 'N/A'}`);
        
        if (Array.isArray(images) && images.length > 0) {
            for (let i = 0; i < images.length; i++) {
                const item = images[i];
                const itemType = typeof item;
                const itemLength = typeof item === 'string' ? item.length : 'N/A';
                const itemPrefix = typeof item === 'string' ? item.substring(0, 50) : JSON.stringify(item).substring(0, 50);
                debugLog.push(`Image[${i}]: type=${itemType}, length=${itemLength}, prefix="${itemPrefix}"`);
            }
        }

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
                let base64String = typeof item === 'string' ? item : (item?.dataUrl || item?.rawBase64 || item?.base64);
                
                debugLog.push(`Processing image[${i}]: extracted base64 is ${base64String ? 'truthy' : 'falsy'}, type=${typeof base64String}`);
                
                if (!base64String || typeof base64String !== 'string') {
                    debugLog.push(`Skipping image[${i}]: no valid base64 data`);
                    continue;
                }

                let contentType = 'image/jpeg';
                let ext = 'jpg';

                if (base64String.includes(',')) {
                    const parts = base64String.split(',');
                    const mimeMatch = parts[0].match(/:(.*?);/);
                    if (mimeMatch && mimeMatch[1]) {
                        contentType = mimeMatch[1];
                    }
                    base64String = parts[1];
                    debugLog.push(`Image[${i}]: extracted MIME=${contentType}, raw base64 length=${base64String.length}`);
                } else {
                    debugLog.push(`Image[${i}]: no comma found, treating entire string as raw base64, length=${base64String.length}`);
                }

                const mimeLower = contentType.toLowerCase();
                if (mimeLower.includes('webp')) ext = 'webp';
                else if (mimeLower.includes('png')) ext = 'png';
                else if (mimeLower.includes('heic')) { ext = 'heic'; contentType = 'image/heic'; }
                else if (mimeLower.includes('heif')) { ext = 'heif'; contentType = 'image/heif'; }
                else if (mimeLower.includes('avif')) { ext = 'avif'; contentType = 'image/avif'; }
                else if (mimeLower.includes('gif')) { ext = 'gif'; contentType = 'image/gif'; }
                else if (mimeLower.includes('bmp')) { ext = 'bmp'; contentType = 'image/bmp'; }
                else if (mimeLower.includes('svg')) { ext = 'svg'; contentType = 'image/svg+xml'; }
                // Sanitize base64 string from whitespace/newlines
                const sanitizedBase64 = base64String.replace(/\s+/g, '');
                const buffer = Buffer.from(sanitizedBase64, 'base64');
                debugLog.push(`Image[${i}]: buffer size=${buffer.length} bytes`);
                
                if (!buffer || buffer.length === 0) {
                    debugLog.push(`Skipping image[${i}]: empty buffer`);
                    continue;
                }

                const fileName = `${user.id}-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
                debugLog.push(`Image[${i}]: uploading as ${fileName} (${contentType})`);

                const { data: uploadData, error: uploadErr } = await serviceClient.storage
                    .from('products')
                    .upload(fileName, buffer, {
                        contentType,
                        upsert: true,
                        cacheControl: '31536000'
                    });

                if (uploadErr) {
                    debugLog.push(`Image[${i}]: UPLOAD ERROR: ${uploadErr.message}`);
                    console.error('[createListingAction] Image upload error:', uploadErr);
                    if (uploadedPaths.length > 0) {
                        await serviceClient.storage.from('products').remove(uploadedPaths).catch(() => {});
                    }
                    return { success: false, error: `Failed to upload image ${i + 1}: ${uploadErr.message}`, debug: debugLog.join('\n') };
                }

                debugLog.push(`Image[${i}]: UPLOAD SUCCESS, path=${uploadData?.path || fileName}`);
                uploadedPaths.push(fileName);

                const { data: { publicUrl } } = serviceClient.storage
                    .from('products')
                    .getPublicUrl(fileName);

                debugLog.push(`Image[${i}]: publicUrl=${publicUrl}`);
                uploadedUrls.push(publicUrl);
            }
        }

        debugLog.push(`Total uploaded: ${uploadedUrls.length} images`);

        // If user submitted photos but none uploaded, return error
        if (Array.isArray(images) && images.length > 0 && uploadedUrls.length === 0) {
            return { success: false, error: 'Failed to process and upload selected photos. Please try again.', debug: debugLog.join('\n') };
        }

        let mainImageUrl = uploadedUrls.length > 0
            ? uploadedUrls[0]
            : 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=1000';

        debugLog.push(`mainImageUrl: ${mainImageUrl.substring(0, 80)}...`);

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
            return { success: false, error: insertError.message || 'Failed to save listing to database', debug: debugLog.join('\n') };
        }

        const newProductId = insertData?.[0]?.id;
        debugLog.push(`Product created: ${newProductId}`);
        
        return { success: true, productId: newProductId, debug: debugLog.join('\n') };
    } catch (err) {
        debugLog.push(`EXCEPTION: ${err.message}`);
        console.error('[createListingAction] Unexpected exception:', err);
        return { success: false, error: err.message || 'An unexpected error occurred while creating the listing', debug: debugLog.join('\n') };
    }
}
