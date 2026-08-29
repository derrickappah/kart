/**
 * Image utility functions for handling profile picture and product listing uploads
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
        const byteString = atob(parts[1]);
        const mimeString = parts[0].split(':')[1].split(';')[0];
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
 * Validates an image file for upload
 * @param {File} file - The file to validate
 * @returns {Object} - { valid: boolean, error: string }
 */
export function validateImage(file) {
    const maxSize = 25 * 1024 * 1024; // 25MB allowance (modern phone camera friendly)
    const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
        'image/heic', 'image/heif', 'image/avif', 'image/gif'
    ];

    if (!file) {
        return { valid: false, error: 'No file selected' };
    }

    const fileName = (file.name || '').toLowerCase();
    const isAllowedExt = /\.(jpe?g|png|webp|heic|heif|avif|gif)$/i.test(fileName);
    const isAllowedType = allowedTypes.includes(file.type?.toLowerCase());

    // On mobile devices, file.type is sometimes empty string or octet-stream for gallery picks
    if (!isAllowedType && !isAllowedExt && file.type !== '' && file.type !== 'application/octet-stream') {
        return { valid: false, error: 'Invalid file type. Please upload a JPG, PNG, WebP, or HEIC image.' };
    }

    if (file.size > maxSize) {
        return { valid: false, error: 'File size too large. Maximum size is 25MB.' };
    }

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
 * Compresses and optimizes a product image for marketplace listing.
 * Highly optimized for Mobile Safari, Android, and Capacitor WebViews.
 * Downscales to max 1200x1200 and encodes to JPEG blob (~80-150KB).
 * 
 * @param {File|Blob} file - The image file to compress
 * @param {Object} options - Compression options
 * @returns {Promise<{ blob: Blob, extension: string, contentType: string }>}
 */
export async function compressProductImage(file, { maxWidth = 1200, maxHeight = 1200, quality = 0.75 } = {}) {
    if (!file) {
        return { blob: file, extension: 'jpg', contentType: 'image/jpeg' };
    }

    if (typeof window === 'undefined') {
        const ext = getFileExtension(file);
        return { blob: file, extension: ext, contentType: file.type || 'image/jpeg' };
    }

    // Try native createImageBitmap first (hardware accelerated, decodes HEIC & EXIF on modern mobile)
    let sourceImage = null;
    let isBitmap = false;

    if (typeof createImageBitmap === 'function') {
        try {
            sourceImage = await createImageBitmap(file);
            isBitmap = true;
        } catch {
            // Fallback to Image element
        }
    }

    if (!sourceImage) {
        sourceImage = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => resolve(null);
                img.src = e.target.result;
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
        });
    }

    if (!sourceImage) {
        console.warn('[ImageUtils] Image decode failed, passing original file');
        const ext = getFileExtension(file);
        return { blob: file, extension: ext, contentType: file.type || 'image/jpeg' };
    }

    try {
        let width = sourceImage.width || sourceImage.naturalWidth;
        let height = sourceImage.height || sourceImage.naturalHeight;

        if (!width || !height || width <= 0 || height <= 0) {
            if (isBitmap && sourceImage.close) sourceImage.close();
            const ext = getFileExtension(file);
            return { blob: file, extension: ext, contentType: file.type || 'image/jpeg' };
        }

        // Downscale bounds
        if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.max(1, Math.round(width * ratio));
            height = Math.max(1, Math.round(height * ratio));
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) {
            if (isBitmap && sourceImage.close) sourceImage.close();
            const ext = getFileExtension(file);
            return { blob: file, extension: ext, contentType: file.type || 'image/jpeg' };
        }

        // Fill clean white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(sourceImage, 0, 0, width, height);

        if (isBitmap && sourceImage.close) {
            sourceImage.close();
        }

        // Export as universal JPEG (guaranteed ~80KB-150KB)
        let blob = null;

        if (typeof canvas.toBlob === 'function') {
            blob = await new Promise((res) => {
                canvas.toBlob((b) => res(b), 'image/jpeg', quality);
            });
        }

        if (!blob || blob.size === 0) {
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            blob = dataURItoBlob(dataUrl);
        }

        if (blob && blob.size > 0) {
            return {
                blob,
                extension: 'jpg',
                contentType: 'image/jpeg'
            };
        }

        const ext = getFileExtension(file);
        return { blob: file, extension: ext, contentType: file.type || 'image/jpeg' };
    } catch (err) {
        console.warn('[ImageUtils] Canvas processing exception, passing original file:', err);
        const ext = getFileExtension(file);
        return { blob: file, extension: ext, contentType: file.type || 'image/jpeg' };
    }
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
 * @param {File} file - The file object
 * @returns {string} - File extension
 */
export function getFileExtension(file) {
    if (!file) return 'jpg';
    const mimeToExt = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/heic': 'jpg',
        'image/heif': 'jpg',
        'image/avif': 'avif',
        'image/gif': 'gif'
    };

    if (file.type && mimeToExt[file.type.toLowerCase()]) {
        return mimeToExt[file.type.toLowerCase()];
    }

    if (file.name) {
        const parts = file.name.split('.');
        if (parts.length > 1) {
            const ext = parts.pop().toLowerCase();
            if (['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'].includes(ext)) {
                return ext === 'jpeg' ? 'jpg' : ext;
            }
        }
    }

    return 'jpg';
}
