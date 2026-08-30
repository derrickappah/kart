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
 * Converts a HEIC/HEIF File or Blob to a standard JPEG Blob in browser environments.
 * If the input is not HEIC/HEIF or in SSR, returns original file/blob as-is.
 * @param {File|Blob} fileOrBlob 
 * @returns {Promise<Blob|File>}
 */
export async function convertHeicToJpeg(fileOrBlob) {
    if (!fileOrBlob || typeof window === 'undefined') return fileOrBlob;

    const fileName = fileOrBlob.name || '';
    const fileType = fileOrBlob.type || '';
    const isHeic = (
        fileType.toLowerCase().includes('heic') ||
        fileType.toLowerCase().includes('heif') ||
        fileName.toLowerCase().endsWith('.heic') ||
        fileName.toLowerCase().endsWith('.heif')
    );

    if (!isHeic) return fileOrBlob;

    try {
        const heic2any = (await import('heic2any')).default;
        const converted = await heic2any({
            blob: fileOrBlob,
            toType: 'image/jpeg',
            quality: 0.85
        });
        const finalBlob = Array.isArray(converted) ? converted[0] : converted;
        return finalBlob || fileOrBlob;
    } catch (e) {
        console.warn('[ImageUtils] heic2any conversion fallback:', e);
        return fileOrBlob;
    }
}

/**
 * Compresses and resizes an avatar image
 * @param {File} file - The image file to compress
 * @param {number} maxWidth - Maximum width (default: 400)
 * @param {number} maxHeight - Maximum height (default: 400)
 * @param {number} quality - Compression quality 0-1 (default: 0.8)
 * @returns {Promise<Blob>} - Compressed image blob
 */
export async function compressImage(file, maxWidth = 400, maxHeight = 400, quality = 0.8) {
    const convertedFile = await convertHeicToJpeg(file);

    return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();

            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.naturalWidth || img.width;
                let height = img.naturalHeight || img.height;

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
                    return resolve(convertedFile);
                }
                // White background prevents transparent PNGs from turning black
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                try {
                    const dataUrl = canvas.toDataURL('image/jpeg', quality);
                    const blob = dataURItoBlob(dataUrl);
                    resolve(blob || convertedFile);
                } catch {
                    resolve(convertedFile);
                }
            };

            img.onerror = () => {
                resolve(convertedFile);
            };

            img.src = e.target.result;
        };

        reader.onerror = () => {
            resolve(convertedFile);
        };

        reader.readAsDataURL(convertedFile);
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
 * Automatically converts HEIC/HEIF to JPEG and uses standard HTMLImageElement + 2D Canvas with white background.
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

    let file = fileOrObject.file || fileOrObject;

    // Convert HEIC/HEIF to JPEG in browser
    if (file instanceof Blob || (typeof File !== 'undefined' && file instanceof File)) {
        try {
            file = await convertHeicToJpeg(file);
        } catch (e) {
            console.warn('[ImageUtils] convertHeicToJpeg error:', e);
        }
    }

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

    // Step B: Downscale via Canvas using HTMLImageElement (avoids WebKit createImageBitmap black frame bug)
    try {
        let sourceUrl = rawBase64;
        let blobUrlCreated = null;

        if (!sourceUrl && file instanceof Blob) {
            blobUrlCreated = URL.createObjectURL(file);
            sourceUrl = blobUrlCreated;
        }

        if (sourceUrl) {
            const img = await new Promise((resolve) => {
                const image = new Image();
                if (typeof sourceUrl === 'string' && (sourceUrl.startsWith('http://') || sourceUrl.startsWith('https://'))) {
                    image.setAttribute('crossOrigin', 'anonymous');
                }
                image.onload = () => resolve(image);
                image.onerror = () => resolve(null);
                image.src = sourceUrl;
            });

            if (blobUrlCreated) {
                URL.revokeObjectURL(blobUrlCreated);
            }

            if (img) {
                let width = img.naturalWidth || img.width;
                let height = img.naturalHeight || img.height;

                if (width > 0 && height > 0) {
                    if (width > maxWidth || height > maxHeight) {
                        const ratio = Math.min(maxWidth / width, maxHeight / height);
                        width = Math.max(1, Math.round(width * ratio));
                        height = Math.max(1, Math.round(height * ratio));
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');

                    if (ctx) {
                        // Fill white background to prevent transparent parts / JPEG from turning pitch black
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillRect(0, 0, width, height);
                        ctx.drawImage(img, 0, 0, width, height);

                        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                        if (compressedDataUrl && compressedDataUrl.startsWith('data:image/jpeg') && compressedDataUrl.length > 50) {
                            const blob = dataURItoBlob(compressedDataUrl);
                            return {
                                dataUrl: compressedDataUrl,
                                blob: blob || file,
                                extension: 'jpg',
                                contentType: 'image/jpeg'
                            };
                        }
                    }
                }
            }
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

/**
 * Creates an Image object from a source URL
 * @param {string} url 
 * @returns {Promise<HTMLImageElement>}
 */
export const createImage = (url) =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        // ONLY set crossOrigin on remote http/https URLs. Never on blob: or data: URLs.
        if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
            image.setAttribute('crossOrigin', 'anonymous');
        }
        image.src = url;
    });

/**
 * Converts degrees to radians
 * @param {number} degreeValue 
 * @returns {number}
 */
export function getRadianAngle(degreeValue) {
    return (degreeValue * Math.PI) / 180;
}

/**
 * Calculates new bounding box size after rotation
 * @param {number} width 
 * @param {number} height 
 * @param {number} rotation 
 * @returns {{ width: number, height: number }}
 */
export function rotateSize(width, height, rotation) {
    const rotRad = getRadianAngle(rotation);
    return {
        width:
            Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
        height:
            Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
    };
}

/**
 * Crops and rotates an image based on pixel crop coordinates and returns high quality dataUrl and Blob.
 * 
 * @param {string|Blob|File} imageSrc - Source dataUrl, blob URL, or Blob
 * @param {Object} pixelCrop - { x, y, width, height }
 * @param {number} rotation - Rotation in degrees (0, 90, 180, 270)
 * @param {Object} flip - { horizontal: boolean, vertical: boolean }
 * @param {number} maxOutputWidth - Max export width
 * @param {number} maxOutputHeight - Max export height
 * @param {number} quality - JPEG compression quality
 * @returns {Promise<{ dataUrl: string, blob: Blob, width: number, height: number }|null>}
 */
export async function getCroppedImg(
    imageSrc,
    pixelCrop,
    rotation = 0,
    flip = { horizontal: false, vertical: false },
    maxOutputWidth = 1400,
    maxOutputHeight = 1400,
    quality = 0.85
) {
    if (!imageSrc || !pixelCrop) return null;

    try {
        let srcUrl = imageSrc;
        let createdBlobUrl = null;

        if (imageSrc instanceof Blob || (typeof File !== 'undefined' && imageSrc instanceof File)) {
            const converted = await convertHeicToJpeg(imageSrc);
            createdBlobUrl = URL.createObjectURL(converted);
            srcUrl = createdBlobUrl;
        }

        const image = await createImage(srcUrl);

        if (createdBlobUrl) {
            URL.revokeObjectURL(createdBlobUrl);
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) return null;

        const rotRad = getRadianAngle(rotation);

        // Calculate bounding box of the rotated image
        const naturalWidth = image.naturalWidth || image.width;
        const naturalHeight = image.naturalHeight || image.height;

        const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
            naturalWidth,
            naturalHeight,
            rotation
        );

        // Set canvas size to match the bounding box
        canvas.width = Math.max(1, Math.round(bBoxWidth));
        canvas.height = Math.max(1, Math.round(bBoxHeight));

        // Fill background with white to avoid black background in JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Translate canvas context to center location to allow rotating and flipping around the center
        ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
        ctx.rotate(rotRad);
        ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
        ctx.translate(-naturalWidth / 2, -naturalHeight / 2);

        // Draw rotated image
        ctx.drawImage(image, 0, 0);

        const croppedCanvas = document.createElement('canvas');
        const croppedCtx = croppedCanvas.getContext('2d');

        if (!croppedCtx) return null;

        let outWidth = Math.max(1, Math.round(pixelCrop.width));
        let outHeight = Math.max(1, Math.round(pixelCrop.height));

        // Scale down gracefully if exceeding maximum limits
        if (outWidth > maxOutputWidth || outHeight > maxOutputHeight) {
            const ratio = Math.min(maxOutputWidth / outWidth, maxOutputHeight / outHeight);
            outWidth = Math.max(1, Math.round(outWidth * ratio));
            outHeight = Math.max(1, Math.round(outHeight * ratio));
        }

        croppedCanvas.width = outWidth;
        croppedCanvas.height = outHeight;

        // White background fallback for transparent images / out-of-bounds crops
        croppedCtx.fillStyle = '#FFFFFF';
        croppedCtx.fillRect(0, 0, outWidth, outHeight);

        croppedCtx.drawImage(
            canvas,
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            outWidth,
            outHeight
        );

        const dataUrl = croppedCanvas.toDataURL('image/jpeg', quality);
        const blob = dataURItoBlob(dataUrl);

        return {
            dataUrl,
            blob,
            width: outWidth,
            height: outHeight,
        };
    } catch (err) {
        console.error('[ImageUtils] getCroppedImg failed:', err);
        return null;
    }
}
