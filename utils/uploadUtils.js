import { compressProductImage } from './imageUtils';
import { createClient } from './supabase/client';

/**
 * Resiliently upload a single image to Supabase storage.
 * 1. Optimizes and compresses the image client-side to minimize payload and transmission time.
 * 2. Attempts direct client-side upload to Supabase Storage with auto-retry.
 * 3. Automatically falls back to /api/upload server proxy if client connection fails (e.g. adblocker, DNS, CORS).
 * 
 * @param {File|Blob} file - The file to upload
 * @param {string} userId - Current authenticated user ID
 * @param {Object} options - Configuration options
 * @returns {Promise<{ publicUrl: string, filePath: string }>}
 */
export async function uploadProductImage(file, userId, options = {}) {
    const {
        supabaseClient = null,
        bucket = 'products',
        maxRetries = 2,
        folder = userId || 'anonymous'
    } = options;

    const supabase = supabaseClient || createClient();

    // Step 1: Compress image on client
    const { blob, extension, contentType } = await compressProductImage(file);
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${extension}`;
    const filePath = fileName;

    // Step 2: Attempt direct client upload with exponential backoff retries
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            if (attempt > 0) {
                // Wait before retrying (500ms, 1200ms)
                await new Promise((resolve) => setTimeout(resolve, attempt * 600));
            }

            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(filePath, blob, {
                    contentType: contentType || 'image/jpeg',
                    upsert: true,
                    cacheControl: '31536000'
                });

            if (uploadError) {
                lastError = uploadError;
                console.warn(`[Upload] Direct upload attempt ${attempt + 1} failed:`, uploadError.message);
                continue;
            }

            // Direct upload succeeded
            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(filePath);

            return { publicUrl, filePath };
        } catch (err) {
            lastError = err;
            console.warn(`[Upload] Direct upload exception attempt ${attempt + 1}:`, err.message || err);
        }
    }

    // Step 3: Direct upload failed — Fallback to server-side /api/upload route
    try {
        console.log('[Upload] Attempting server-side fallback upload via /api/upload...');
        const formData = new FormData();
        // Convert blob to File with proper name and MIME
        const fileToUpload = new File([blob], fileName.split('/').pop(), { type: contentType });
        formData.append('file', fileToUpload);
        formData.append('bucket', bucket);
        formData.append('filePath', filePath);

        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
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
        throw new Error(errorData.error || `Server upload failed with status ${response.status}`);
    } catch (serverErr) {
        console.error('[Upload] Both direct and fallback upload failed:', serverErr);
        const detail = lastError?.message || serverErr.message || 'Network connection failed';
        throw new Error(`Upload failed: ${detail}. Please check your connection and try again.`);
    }
}

/**
 * Uploads multiple product images sequentially/in controlled batches
 * @param {Array<File|Blob>} files - Array of image files
 * @param {string} userId - Current authenticated user ID
 * @param {Object} options - Options including progress callback
 * @returns {Promise<{ urls: string[], paths: string[] }>}
 */
export async function uploadProductImages(files, userId, options = {}) {
    const {
        onProgress = null,
        bucket = 'products',
        concurrency = 2
    } = options;

    if (!files || files.length === 0) {
        return { urls: [], paths: [] };
    }

    const uploadedUrls = [];
    const uploadedPaths = [];
    let completedCount = 0;
    const total = files.length;

    // Helper to upload single file and notify progress
    const processFile = async (file) => {
        const result = await uploadProductImage(file, userId, { bucket });
        completedCount++;
        if (onProgress) {
            onProgress({
                completed: completedCount,
                total,
                percent: Math.round((completedCount / total) * 100)
            });
        }
        return result;
    };

    try {
        // Process files in concurrency batches
        for (let i = 0; i < files.length; i += concurrency) {
            const chunk = files.slice(i, i + concurrency);
            const results = await Promise.all(chunk.map(file => processFile(file)));
            for (const res of results) {
                uploadedUrls.push(res.publicUrl);
                uploadedPaths.push(res.filePath);
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
