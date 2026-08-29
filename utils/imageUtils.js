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
 * Uses FileReader for 100% compatibility across Mobile Safari, Android, and WebViews.
 * Downscales to max 1280x1280 and encodes to WebP/JPEG blob (~100-250KB).
 * 
 * @param {File|Blob} file - The image file to compress
 * @param {Object} options - Compression options
 * @returns {Promise<{ blob: Blob, extension: string, contentType: string }>}
 */
export function compressProductImage(file, { maxWidth = 1280, maxHeight = 1280, quality = 0.8 } = {}) {
    return new Promise((resolve) => {
        if (!file) {
            return resolve({ blob: file, extension: 'jpg', contentType: 'image/jpeg' });
        }

        // If not running in browser environment, return original
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            const ext = getFileExtension(file);
            return resolve({ blob: file, extension: ext, contentType: file.type || 'image/jpeg' });
        }

        const reader = new FileReader();

        reader.onload = (readerEvent) => {
            const img = new Image();

            img.onload = () => {
                try {
                    let width = img.naturalWidth || img.width;
                    let height = img.naturalHeight || img.height;

                    if (!width || !height || width <= 0 || height <= 0) {
                        const ext = getFileExtension(file);
                        return resolve({ blob: file, extension: ext, contentType: file.type || 'image/jpeg' });
                    }

                    // Calculate bounded aspect ratio
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
                        const ext = getFileExtension(file);
                        return resolve({ blob: file, extension: ext, contentType: file.type || 'image/jpeg' });
                    }

                    // Fill white background for non-alpha rendering
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0, width, height);

                    // Try exporting to WebP or JPEG using synchronous dataURL fallback for mobile webviews
                    try {
                        let dataUrl = null;
                        let outputFormat = 'webp';
                        let contentType = 'image/webp';

                        // Test webp support via toDataURL
                        const testWebp = canvas.toDataURL('image/webp', quality);
                        if (testWebp && testWebp.startsWith('data:image/webp')) {
                            dataUrl = testWebp;
                            outputFormat = 'webp';
                            contentType = 'image/webp';
                        } else {
                            dataUrl = canvas.toDataURL('image/jpeg', quality);
                            outputFormat = 'jpg';
                            contentType = 'image/jpeg';
                        }

                        const blob = dataURItoBlob(dataUrl);
                        if (blob && blob.size > 0) {
                            return resolve({
                                blob,
                                extension: outputFormat,
                                contentType
                            });
                        }
                    } catch (canvasErr) {
                        console.warn('[ImageUtils] Canvas toDataURL failed, using original:', canvasErr);
                    }

                    const ext = getFileExtension(file);
                    return resolve({ blob: file, extension: ext, contentType: file.type || 'image/jpeg' });
                } catch (err) {
                    console.warn('[ImageUtils] Compression error:', err);
                    const ext = getFileExtension(file);
                    return resolve({ blob: file, extension: ext, contentType: file.type || 'image/jpeg' });
                }
            };

            img.onerror = () => {
                console.warn('[ImageUtils] Image load error on dataURL, using original file');
                const ext = getFileExtension(file);
                return resolve({ blob: file, extension: ext, contentType: file.type || 'image/jpeg' });
            };

            img.src = readerEvent.target.result;
        };

        reader.onerror = () => {
            console.warn('[ImageUtils] FileReader error on file, using original file');
            const ext = getFileExtension(file);
            return resolve({ blob: file, extension: ext, contentType: file.type || 'image/jpeg' });
        };

        reader.readAsDataURL(file);
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
