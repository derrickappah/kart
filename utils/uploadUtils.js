import { compressProductImage } from './imageUtils';
import { createClient } from './supabase/client';

/**
 * Resiliently upload a single image.
 * 1. Hardware-accelerated client-side compression to lightweight JPEG (~80-150KB).
 * 2. Primary: JSON Base64 upload to /api/upload with Bearer authentication.
 * 3. Secondary Fallback: Direct upload to Supabase Storage with binary blob.
 * 
 * @param {File|Blob} file - The file to upload
 * @param {string} userId - Current authenticated user ID
 * @param {Object} options - Configuration options
 * @returns {Promise<{ publicUrl: string, filePath: string }>}
 */
export async function uploadProductImage(file, userId, options = {}) {
    const {
        supabaseClient = null,
        bucket = 'products'
    } = options;

    const supabase = supabaseClient || createClient();

    // Step 1: Compress image on client to universal JPEG (~80-150KB)
    const { dataUrl, blob, extension, contentType } = await compressProductImage(file);
    const fileName = `${userId || 'item'}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${extension}`;
    const filePath = fileName;

    let apiError = null;

    // Step 2: Primary Strategy — /api/upload with JSON payload (fastest, most reliable across mobile & Capacitor)
    if (dataUrl) {
        try {
            const { data: { session } } = await supabase.auth.getSession();

            const headers = {
                'Content-Type': 'application/json'
            };
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }

            let uploadUrl = '/api/upload';
            if (typeof window !== 'undefined' && window.location.origin) {
                const isLocalhostApp = window.location.origin.includes('localhost') && !window.location.origin.includes(':3000');
                const isCapacitorScheme = window.location.origin.startsWith('capacitor:') || window.location.origin.startsWith('ionic:');
                if (isLocalhostApp || isCapacitorScheme) {
                    const appHost = process.env.NEXT_PUBLIC_APP_URL || 'https://kart-murex.vercel.app';
                    uploadUrl = `${appHost}/api/upload`;
                }
            }

            const response = await fetch(uploadUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    imageBase64: dataUrl,
                    bucket,
                    filePath
                }),
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.publicUrl) {
                    return {
                        publicUrl: data.publicUrl,
                        filePath: data.filePath || filePath
                    };
                }
                throw new Error(data.error || 'Upload API returned unsuccessful status');
            }

            const errorData = await response.json().catch(() => ({}));
            apiError = new Error(errorData.error || `Upload API failed with status ${response.status}`);
            console.warn('[Upload] Primary JSON API upload failed:', apiError.message);
        } catch (err) {
            apiError = err;
            console.warn('[Upload] Primary JSON API upload exception, attempting direct fallback:', err.message || err);
        }
    }

    // Step 3: Secondary Strategy — Direct Supabase Storage upload
    try {
        console.log('[Upload] Attempting direct Supabase storage upload...');
        const payloadToUpload = blob || file;

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, payloadToUpload, {
                contentType: contentType || 'image/jpeg',
                upsert: true,
                cacheControl: '31536000'
            });

        if (!uploadError && uploadData) {
            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(filePath);

            if (publicUrl) {
                return { publicUrl, filePath };
            }
        }

        if (uploadError) {
            console.error('[Upload] Direct Supabase upload failed:', uploadError);
            throw new Error(uploadError.message || 'Direct storage upload failed');
        }
    } catch (directErr) {
        console.error('[Upload] Both API and direct storage upload failed:', directErr);
        const detail = apiError?.message || directErr.message || 'Network connection failed';
        throw new Error(`Upload failed: ${detail}. Please check your connection and try again.`);
    }
}

/**
 * Uploads multiple product images sequentially in controlled order
 * @param {Array<File|Blob>} files - Array of image files
 * @param {string} userId - Current authenticated user ID
 * @param {Object} options - Options including progress callback
 * @returns {Promise<{ urls: string[], paths: string[] }>}
 */
export async function uploadProductImages(files, userId, options = {}) {
    const {
        onProgress = null,
        bucket = 'products'
    } = options;

    if (!files || files.length === 0) {
        return { urls: [], paths: [] };
    }

    const uploadedUrls = [];
    const uploadedPaths = [];
    let completedCount = 0;
    const total = files.length;

    try {
        for (const file of files) {
            const result = await uploadProductImage(file, userId, { bucket });
            uploadedUrls.push(result.publicUrl);
            uploadedPaths.push(result.filePath);

            completedCount++;
            if (onProgress) {
                onProgress({
                    completed: completedCount,
                    total,
                    percent: Math.round((completedCount / total) * 100)
                });
            }
        }

        return { urls: uploadedUrls, paths: uploadedPaths };
    } catch (error) {
        if (uploadedPaths.length > 0) {
            try {
                const supabase = createClient();
                await supabase.storage.from(bucket).remove(uploadedPaths);
            } catch (cleanupErr) {
                console.warn('[Upload] Failed to clean up partially uploaded files:', cleanupErr);
            }
        }
        throw error;
    }
}
