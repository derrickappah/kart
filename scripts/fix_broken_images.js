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

// Verified high quality backup image per category
const CATEGORY_FALLBACK_IMAGES = {
    'Arts & Crafts': 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=800',
    'Tickets & Events': 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=800',
    'Services & Tutoring': 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=800',
    'Sports & Fitness': 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=800',
    'Textbooks': 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=800',
    'School Supplies': 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&q=80&w=800',
    'Dorm Furniture': 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=800',
    'Games & Consoles': 'https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?auto=format&fit=crop&q=80&w=800',
    'Musical Instruments': 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&q=80&w=800',
    'Home Appliances': 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&q=80&w=800',
    'Electronics': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800',
    'Clothing': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800',
    'Beauty & Grooming': 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=800',
    'Health & Wellness': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800',
    'Kitchenware': 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&q=80&w=800'
};

const uploadedCategoryFallbacks = {};

async function getCategorySupabaseImage(category) {
    if (uploadedCategoryFallbacks[category]) return uploadedCategoryFallbacks[category];

    const sourceUrl = CATEGORY_FALLBACK_IMAGES[category] || CATEGORY_FALLBACK_IMAGES['Electronics'];
    try {
        const res = await fetch(sourceUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buffer = Buffer.from(await res.arrayBuffer());
        const fileName = `fallback-${category.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}.jpg`;
        const { error } = await supabase.storage.from('products').upload(fileName, buffer, { contentType: 'image/jpeg', upsert: true });
        if (!error) {
            const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(fileName);
            uploadedCategoryFallbacks[category] = publicUrl;
            return publicUrl;
        }
    } catch (e) {
        console.error('Error creating category fallback:', e.message);
    }
    return 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=800';
}

async function uploadToSupabase(url, productId, index = 0, category = 'Electronics') {
    if (!url || typeof url !== 'string') return await getCategorySupabaseImage(category);
    if (url.startsWith(SUPABASE_STORAGE_PREFIX)) return url;

    try {
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!res.ok) {
            console.warn(`URL failed with ${res.status}: ${url}, using category fallback for ${category}`);
            return await getCategorySupabaseImage(category);
        }

        const contentType = res.headers.get('content-type') || 'image/jpeg';
        let ext = 'jpg';
        if (contentType.includes('webp')) ext = 'webp';
        else if (contentType.includes('png')) ext = 'png';

        const buffer = Buffer.from(await res.arrayBuffer());
        const fileName = `fixed-${productId}-${index}-${Date.now()}.${ext}`;

        const { error: upErr } = await supabase.storage.from('products').upload(fileName, buffer, {
            contentType: contentType.split(';')[0],
            upsert: true
        });

        if (upErr) return await getCategorySupabaseImage(category);

        const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(fileName);
        return publicUrl;
    } catch (e) {
        console.error(`Error fetching ${url}:`, e.message);
        return await getCategorySupabaseImage(category);
    }
}

async function fixAllBrokenImages() {
    console.log('🔍 Scanning all products in the database...');
    const { data: products, error } = await supabase
        .from('products')
        .select('id, title, category, image_url, images');

    if (error) {
        console.error('Error fetching products:', error);
        return;
    }

    console.log(`Checking ${products.length} products...`);

    const brokenProducts = products.filter(p => {
        const mainIsBad = !p.image_url || !p.image_url.startsWith(SUPABASE_STORAGE_PREFIX);
        const galleryIsBad = !Array.isArray(p.images) || p.images.length === 0 || p.images.some(img => !img || !img.startsWith(SUPABASE_STORAGE_PREFIX));
        return mainIsBad || galleryIsBad;
    });

    console.log(`Found ${brokenProducts.length} products with non-Supabase or invalid image URLs.`);

    let fixedCount = 0;
    const concurrency = 6;

    async function fixProduct(p) {
        let newMain = p.image_url;
        if (!newMain || !newMain.startsWith(SUPABASE_STORAGE_PREFIX)) {
            newMain = await uploadToSupabase(p.image_url, p.id, 0, p.category);
        }

        let newGallery = [];
        if (Array.isArray(p.images) && p.images.length > 0) {
            for (let i = 0; i < p.images.length; i++) {
                const img = p.images[i];
                if (!img || !img.startsWith(SUPABASE_STORAGE_PREFIX)) {
                    const fixedImg = await uploadToSupabase(img, p.id, i + 1, p.category);
                    newGallery.push(fixedImg);
                } else {
                    newGallery.push(img);
                }
            }
        } else {
            newGallery = [newMain];
        }

        // Update in DB
        const { error: updateErr } = await supabase
            .from('products')
            .update({
                image_url: newMain,
                images: newGallery
            })
            .eq('id', p.id);

        if (!updateErr) {
            fixedCount++;
            console.log(`✅ Fixed [${p.category}] "${p.title}" -> ${newMain}`);
        } else {
            console.error(`Failed to update ${p.id}:`, updateErr.message);
        }
    }

    for (let i = 0; i < brokenProducts.length; i += concurrency) {
        const batch = brokenProducts.slice(i, i + concurrency);
        await Promise.all(batch.map(p => fixProduct(p)));
    }

    console.log(`\n🎉 Done! Repaired ${fixedCount} products.`);

    // Final audit
    const { data: finalAudit } = await supabase.from('products').select('id, image_url, images');
    const nonSupabase = finalAudit.filter(p => !p.image_url.startsWith(SUPABASE_STORAGE_PREFIX));
    console.log(`Final audit: ${nonSupabase.length} non-Supabase products remaining (Target: 0).`);
}

fixAllBrokenImages();
