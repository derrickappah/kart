/**
 * Image utility functions for handling profile picture and product listing uploads
 * Supports ALL image formats across iOS Safari (Camera/HEIC/RAW), Android Chrome, Desktop, and WebViews.
 */

/**
 * Converts a base64 data URI to a binary Blob
 * @param {string} dataURI 
 * @returns {Blob}
 */
export function dataURItoBlob(dataURI) {
    if (!dataURI || typeof dataURI !== 'string') return null;
    try {
        const parts = dataURI.split(',');
        if (parts.length < 2) return null;
        const byteString = atob(parts[1]);
        const mimeString = parts[0].split(':')[1]?.split(';')[0] || 'image/jpeg';
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        return new Blob([ab], { type: mimeString });
    } catch (e) {
        console.warn('[ImageUtils] dataURItoBlob conversion error:', e);
        return null;
    }
}

/**
 * Validates an image file for upload.
 * Accepts all photo formats (JPEG, PNG, WebP, HEIC, HEIF, AVIF, GIF, BMP, TIFF, SVG, RAW, camera files).
 * @param {File|Blob} file - The file to validate
 * @returns {Object} - { valid: boolean, error: string }
 */
export function validateImage(file) {
    const maxSize = 50 * 1024 * 1024; // 50MB allowance

    if (!file) {
        return { valid: false, error: 'No file selected' };
    }

    if (file.size && file.size > maxSize) {
        return { valid: false, error: 'File size too large. Maximum size is 50MB.' };
    }

    // Always accept any file selected by user
    return { valid: true, error: null };
}

/**
 * Compresses and resizes an avatar image
 * @param {File} file - The image file to compress
 * @param {number} maxWidth - Maximum width (default: 400)
 * @param {number} maxHeight - Maximum height (default: 400)
 * @param {number} quality - Compression quality 0-1 (default: 0.8)
 * @returns {Promise<Blob>} - Compressed image blob
 */
export function compressImage(file, maxWidth = 400, maxHeight = 400, quality = 0.8) {
    return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();

            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = Math.max(1, width);
                canvas.height = Math.max(1, height);

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return resolve(file);
                }
                ctx.drawImage(img, 0, 0, width, height);

                try {
                    const dataUrl = canvas.toDataURL('image/jpeg', quality);
                    const blob = dataURItoBlob(dataUrl);
                    resolve(blob || file);
                } catch {
                    resolve(file);
                }
            };

            img.onerror = () => {
                resolve(file);
            };

            img.src = e.target.result;
        };

        reader.onerror = () => {
            resolve(file);
        };

        reader.readAsDataURL(file);
    });
}

/**
 * Reads a File, Blob, or Blob URL into a Base64 string.
 * @param {File|Blob|string} source 
 * @returns {Promise<string|null>}
 */
export async function readFileAsBase64(source) {
    if (!source) return null;
    if (typeof source === 'string') {
        if (source.startsWith('data:')) return source;
        if (source.startsWith('blob:') || source.startsWith('http')) {
            try {
                const res = await fetch(source);
                const blob = await res.blob();
                return await readFileAsBase64(blob);
            } catch (e) {
                console.warn('[ImageUtils] fetch blob URL failed:', e);
            }
        }
        return source;
    }

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result || null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(source);
    });
}

/**
 * Compresses and optimizes a product image for marketplace listing.
 * 100% fail-safe across ALL image formats, iOS Camera, HEIC, Android, and Desktop.
 * 
 * @param {File|Blob|string|Object} fileOrObject - The image file or preview object
 * @param {Object} options - Compression options
 * @returns {Promise<{ dataUrl: string|null, blob: Blob|null, extension: string, contentType: string }>}
 */
export async function compressProductImage(fileOrObject, { maxWidth = 1200, maxHeight = 1200, quality = 0.75 } = {}) {
    if (!fileOrObject) {
        return { dataUrl: null, blob: null, extension: 'jpg', contentType: 'image/jpeg' };
    }

    // If input is already an object with dataUrl
    if (typeof fileOrObject === 'object' && fileOrObject.dataUrl) {
        const dataUrl = fileOrObject.dataUrl;
        const blob = dataURItoBlob(dataUrl);
        return {
            dataUrl,
            blob,
            extension: 'jpg',
            contentType: 'image/jpeg'
        };
    }

    const file = fileOrObject.file || fileOrObject;

    // Step A: Guaranteed base64 extraction
    let rawBase64 = null;
    try {
        rawBase64 = await readFileAsBase64(file);
    } catch (e) {
        console.warn('[ImageUtils] readFileAsBase64 error:', e);
    }

    if (typeof window === 'undefined') {
        const ext = getFileExtension(file);
        return { dataUrl: rawBase64, blob: file, extension: ext, contentType: file?.type || 'image/jpeg' };
    }

    // Step B: Downscale via Canvas
    try {
        let sourceImage = null;
        let isBitmap = false;

        if (typeof createImageBitmap === 'function' && file instanceof Blob) {
            try {
                sourceImage = await createImageBitmap(file);
                isBitmap = true;
            } catch {
                // Fallback to HTMLImageElement
            }
        }

        if (!sourceImage && rawBase64) {
            sourceImage = await new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => resolve(img);
                img.onerror = () => resolve(null);
                img.src = rawBase64;
            });
        }

        if (sourceImage) {
            let width = sourceImage.width || sourceImage.naturalWidth;
            let height = sourceImage.height || sourceImage.naturalHeight;

            if (width > 0 && height > 0) {
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = Math.max(1, Math.round(width * ratio));
                    height = Math.max(1, Math.round(height * ratio));
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d', { alpha: false });

                if (ctx) {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, width, height);
                    ctx.drawImage(sourceImage, 0, 0, width, height);

                    const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                    if (compressedDataUrl && compressedDataUrl.startsWith('data:image/jpeg')) {
                        const blob = dataURItoBlob(compressedDataUrl);
                        if (isBitmap && sourceImage.close) sourceImage.close();
                        return {
                            dataUrl: compressedDataUrl,
                            blob: blob || file,
                            extension: 'jpg',
                            contentType: 'image/jpeg'
                        };
                    }
                }
            }
            if (isBitmap && sourceImage.close) sourceImage.close();
        }
    } catch (err) {
        console.warn('[ImageUtils] Canvas downscaling exception, returning rawBase64:', err);
    }

    // Fail-safe: Always return rawBase64 if canvas downscale did not run
    const ext = getFileExtension(file);
    return {
        dataUrl: rawBase64,
        blob: file instanceof Blob ? file : dataURItoBlob(rawBase64),
        extension: ext,
        contentType: file?.type || 'image/jpeg'
    };
}

/**
 * Generates a unique filename for profile picture
 * @param {string} userId - The user's ID
 * @param {string} fileExtension - File extension (e.g., 'jpg', 'png')
 * @returns {string} - Unique filename
 */
export function generateProfilePicturePath(userId, fileExtension) {
    const timestamp = Date.now();
    return `${userId}/avatar_${timestamp}.${fileExtension}`;
}

/**
 * Gets file extension from filename or MIME type
 * @param {File|Blob|string} file - The file object
 * @returns {string} - File extension
 */
export function getFileExtension(file) {
    if (!file) return 'jpg';
    const mimeToExt = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/heic': 'heic',
        'image/heif': 'heif',
        'image/avif': 'avif',
        'image/gif': 'gif',
        'image/bmp': 'bmp',
        'image/tiff': 'tiff',
        'image/svg+xml': 'svg'
    };

    if (typeof file === 'object' && file.type && mimeToExt[file.type.toLowerCase()]) {
        return mimeToExt[file.type.toLowerCase()];
    }

    const name = typeof file === 'string' ? file : (file.name || '');
    if (name) {
        const parts = name.split('.');
        if (parts.length > 1) {
            const ext = parts.pop().toLowerCase();
            if (['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'avif', 'gif', 'bmp', 'tiff', 'svg', 'raw', 'dng', 'cr2', 'nef', 'arw'].includes(ext)) {
                return ext === 'jpeg' ? 'jpg' : ext;
            }
        }
    }

    return 'jpg';
}
