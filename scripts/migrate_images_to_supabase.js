const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnv() {
    const envPath = path.resolve(__dirname, '..', '.env.local');
    const envFile = fs.readFileSync(envPath, 'utf8');
    const env = {};
    envFile.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            let value = match[2].trim();
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            env[match[1].trim()] = value;
        }
    });
    return env;
}

const env = loadEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const SUPABASE_STORAGE_PREFIX = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/`;

// Cache downloaded and uploaded URLs to avoid duplicate uploads
const urlMap = new Map();

async function downloadAndUploadImage(url, productId, index = 0) {
    if (!url || typeof url !== 'string') return null;
    if (url.startsWith(SUPABASE_STORAGE_PREFIX)) {
        return url; // Already stored in Supabase
    }

    if (urlMap.has(url)) {
        return urlMap.get(url);
    }

    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });

        if (!res.ok) {
            console.warn(`Failed to fetch image: ${url} (Status: ${res.status})`);
            return url;
        }

        const contentType = res.headers.get('content-type') || 'image/jpeg';
        let ext = 'jpg';
        if (contentType.includes('webp')) ext = 'webp';
        else if (contentType.includes('png')) ext = 'png';
        else if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = 'jpg';
        else if (contentType.includes('gif')) ext = 'gif';

        const buffer = Buffer.from(await res.arrayBuffer());
        const fileName = `${productId}-img${index}-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from('products')
            .upload(fileName, buffer, {
                contentType: contentType.split(';')[0],
                upsert: true
            });

        if (uploadError) {
            console.error(`Upload error for ${fileName}:`, uploadError.message);
            return url;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('products')
            .getPublicUrl(fileName);

        urlMap.set(url, publicUrl);
        return publicUrl;
    } catch (err) {
        console.error(`Error processing image ${url}:`, err.message);
        return url;
    }
}

async function migrateAllImages() {
    console.log('📦 Fetching all products from Supabase...');
    const { data: products, error } = await supabase
        .from('products')
        .select('id, title, image_url, images');

    if (error) {
        console.error('Error fetching products:', error);
        return;
    }

    // Filter products that have external images
    const pendingProducts = products.filter(p => {
        const hasExternalMain = p.image_url && !p.image_url.startsWith(SUPABASE_STORAGE_PREFIX);
        const hasExternalGallery = Array.isArray(p.images) && p.images.some(img => img && !img.startsWith(SUPABASE_STORAGE_PREFIX));
        return hasExternalMain || hasExternalGallery;
    });

    console.log(`Found ${products.length} total products.`);
    console.log(`Found ${pendingProducts.length} products needing image migration to Supabase Storage.\n`);

    if (pendingProducts.length === 0) {
        console.log('✨ All images are already stored in Supabase Storage!');
        return;
    }

    let completedCount = 0;
    const concurrency = 5;

    async function processProduct(product, idx) {
        const itemNumber = idx + 1;
        console.log(`[${itemNumber}/${pendingProducts.length}] Processing: "${product.title}"...`);

        // 1. Upload main image
        let newMainUrl = product.image_url;
        if (product.image_url && !product.image_url.startsWith(SUPABASE_STORAGE_PREFIX)) {
            newMainUrl = await downloadAndUploadImage(product.image_url, product.id, 0);
        }

        // 2. Upload gallery images
        let newImagesList = [];
        if (Array.isArray(product.images) && product.images.length > 0) {
            for (let gIdx = 0; gIdx < product.images.length; gIdx++) {
                const imgUrl = product.images[gIdx];
                if (imgUrl && !imgUrl.startsWith(SUPABASE_STORAGE_PREFIX)) {
                    const uploaded = await downloadAndUploadImage(imgUrl, product.id, gIdx + 1);
                    newImagesList.push(uploaded || imgUrl);
                } else if (imgUrl) {
                    newImagesList.push(imgUrl);
                }
            }
        } else if (newMainUrl) {
            newImagesList = [newMainUrl];
        }

        // Ensure mainImageUrl is the first gallery image if not set
        if (!newMainUrl && newImagesList.length > 0) {
            newMainUrl = newImagesList[0];
        }

        // 3. Update database record
        const { error: updateError } = await supabase
            .from('products')
            .update({
                image_url: newMainUrl,
                images: newImagesList
            })
            .eq('id', product.id);

        if (updateError) {
            console.error(`❌ Failed to update product ${product.id}:`, updateError.message);
        } else {
            completedCount++;
            console.log(`✅ [${itemNumber}/${pendingProducts.length}] Done: "${product.title}" -> ${newImagesList.length} image(s) saved to Supabase.`);
        }
    }

    // Process in batches
    for (let i = 0; i < pendingProducts.length; i += concurrency) {
        const batch = pendingProducts.slice(i, i + concurrency);
        await Promise.all(batch.map((p, bIdx) => processProduct(p, i + bIdx)));
    }

    console.log(`\n🎉 Migration Complete! Successfully migrated images for ${completedCount} products to Supabase Storage.`);
    console.log(`Unique images uploaded: ${urlMap.size}`);
}

migrateAllImages();
