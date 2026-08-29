import { compressProductImage } from './imageUtils';
import { createClient } from './supabase/client';

/**
 * Resiliently upload a single image.
 * 1. Optimizes and compresses the image client-side to universal ~100KB JPEG.
 * 2. Attempts direct client-side upload to Supabase Storage.
 * 3. Automatically falls back to /api/upload server proxy if client connection fails (e.g. mobile WebKit CORS, adblocker, DNS).
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

    // Step 1: Fast, hardware-accelerated client-side compression (~80-150KB JPEG)
    const { blob, extension, contentType } = await compressProductImage(file);
    const fileName = `${userId || 'item'}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${extension}`;
    const filePath = fileName;

    let directUploadError = null;

    // Step 2: Try direct upload to Supabase
    try {
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, blob, {
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
            directUploadError = uploadError;
            console.warn('[Upload] Direct storage upload failed, using /api/upload fallback:', uploadError.message);
        }
    } catch (directErr) {
        directUploadError = directErr;
        console.warn('[Upload] Direct upload network exception, using /api/upload fallback:', directErr.message || directErr);
    }

    // Step 3: Direct upload failed (often on mobile WebKit/Capacitor) — Use /api/upload server endpoint
    try {
        console.log('[Upload] Executing server-side fallback upload via /api/upload...');

        const { data: { session } } = await supabase.auth.getSession();

        const formData = new FormData();
        formData.append('file', blob, fileName);
        formData.append('bucket', bucket);
        formData.append('filePath', filePath);

        const headers = {};
        if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        let uploadUrl = '/api/upload';
        // Handle Capacitor or isolated webview hosts
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
            body: formData,
            headers,
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
            throw new Error(data.error || 'Server upload returned unsuccessful status');
        }

        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server upload failed (${response.status})`);
    } catch (fallbackErr) {
        console.error('[Upload] Fallback upload failed:', fallbackErr);
        const detail = directUploadError?.message || fallbackErr.message || 'Connection failed';
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
        // Upload one by one sequentially for maximum mobile stability & low memory consumption
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
        // Attempt cleanup of any files uploaded prior to the failure
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
