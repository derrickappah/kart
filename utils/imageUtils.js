/**
 * Image utility functions for handling profile picture uploads
 */

/**
 * Validates an image file
 * @param {File} file - The file to validate
 * @returns {Object} - { valid: boolean, error: string }
 */
export function validateImage(file) {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (!file) {
        return { valid: false, error: 'No file selected' };
    }

    if (!allowedTypes.includes(file.type)) {
        return { valid: false, error: 'Invalid file type. Please upload a JPG, PNG, or WebP image.' };
    }

    if (file.size > maxSize) {
        return { valid: false, error: 'File size too large. Maximum size is 5MB.' };
    }

    return { valid: true, error: null };
}

/**
 * Compresses and resizes an image
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
                    file.type,
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
    const mimeToExt = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp'
    };

    return mimeToExt[file.type] || 'jpg';
}
