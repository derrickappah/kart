/**
 * Image utility functions for handling profile picture and product listing uploads
 */

/**
 * Validates an image file for upload
 * @param {File} file - The file to validate
 * @returns {Object} - { valid: boolean, error: string }
 */
export function validateImage(file) {
    const maxSize = 15 * 1024 * 1024; // 15MB allowance before client compression
    const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
        'image/heic', 'image/heif', 'image/avif'
    ];

    if (!file) {
        return { valid: false, error: 'No file selected' };
    }

    const fileName = (file.name || '').toLowerCase();
    const isAllowedExt = /\.(jpe?g|png|webp|heic|heif|avif)$/i.test(fileName);
    const isAllowedType = allowedTypes.includes(file.type?.toLowerCase());

    if (!isAllowedType && !isAllowedExt && file.type !== '') {
        return { valid: false, error: 'Invalid file type. Please upload a JPG, PNG, WebP, or HEIC image.' };
    }

    if (file.size > maxSize) {
        return { valid: false, error: 'File size too large. Maximum size is 15MB.' };
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
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();

            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions while maintaining aspect ratio
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

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Failed to compress image'));
                        }
                    },
                    file.type || 'image/jpeg',
                    quality
                );
            };

            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };

            img.src = e.target.result;
        };

        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };

        reader.readAsDataURL(file);
    });
}

/**
 * Compresses and optimizes a product image for marketplace listing
 * Resizes large photos to max 1400x1400 and encodes to WebP (or JPEG fallback) at 0.82 quality.
 * Typically reduces a 5-15MB photo down to ~150-250KB with virtually no noticeable visual loss.
 * @param {File|Blob} file - The image file to compress
 * @param {Object} options - Compression options
 * @returns {Promise<{ blob: Blob, extension: string, contentType: string }>}
 */
export function compressProductImage(file, { maxWidth = 1400, maxHeight = 1400, quality = 0.82 } = {}) {
    return new Promise((resolve) => {
        if (!file) {
            return resolve({ blob: file, extension: 'jpg', contentType: 'image/jpeg' });
        }

        // If not running in browser environment, return original
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            const ext = getFileExtension(file);
            return resolve({ blob: file, extension: ext, contentType: file.type || 'image/jpeg' });
        }

        const url = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
            URL.revokeObjectURL(url);
            try {
                const canvas = document.createElement('canvas');
                let width = img.naturalWidth || img.width;
                let height = img.naturalHeight || img.height;

                if (!width || !height || width <= 0 || height <= 0) {
                    const ext = getFileExtension(file);
                    return resolve({ blob: file, extension: ext, contentType: file.type || 'image/jpeg' });
                }

                // Downscale if exceeds max bounds
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = Math.max(1, Math.round(width * ratio));
                    height = Math.max(1, Math.round(height * ratio));
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d', { alpha: false });
                if (!ctx) {
                    const ext = getFileExtension(file);
                    return resolve({ blob: file, extension: ext, contentType: file.type || 'image/jpeg' });
                }

                // Fill white background for clear non-transparent rendering
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);

                // Try exporting as WebP first for optimal compression
                canvas.toBlob(
                    (webpBlob) => {
                        if (webpBlob && webpBlob.size > 0) {
                            resolve({
                                blob: webpBlob,
                                extension: 'webp',
                                contentType: 'image/webp'
                            });
                        } else {
                            // Fallback to JPEG if WebP is not supported by canvas
                            canvas.toBlob(
                                (jpegBlob) => {
                                    if (jpegBlob && jpegBlob.size > 0) {
                                        resolve({
                                            blob: jpegBlob,
                                            extension: 'jpg',
                                            contentType: 'image/jpeg'
                                        });
                                    } else {
                                        const ext = getFileExtension(file);
                                        resolve({
                                            blob: file,
                                            extension: ext,
                                            contentType: file.type || 'image/jpeg'
                                        });
                                    }
                                },
                                'image/jpeg',
                                quality
                            );
                        }
                    },
                    'image/webp',
                    quality
                );
            } catch (err) {
                console.warn('[ImageUtils] Canvas compression warning, using original:', err);
                const ext = getFileExtension(file);
                resolve({ blob: file, extension: ext, contentType: file.type || 'image/jpeg' });
            }
        };

        img.onerror = (err) => {
            URL.revokeObjectURL(url);
            console.warn('[ImageUtils] Image load error during compression, using original:', err);
            const ext = getFileExtension(file);
            resolve({ blob: file, extension: ext, contentType: file.type || 'image/jpeg' });
        };

        img.src = url;
    });
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
        'image/avif': 'avif'
    };

    if (file.type && mimeToExt[file.type.toLowerCase()]) {
        return mimeToExt[file.type.toLowerCase()];
    }

    if (file.name) {
        const parts = file.name.split('.');
        if (parts.length > 1) {
            const ext = parts.pop().toLowerCase();
            if (['jpg', 'jpeg', 'png', 'webp', 'avif'].includes(ext)) {
                return ext === 'jpeg' ? 'jpg' : ext;
            }
        }
    }

    return 'jpg';
}
