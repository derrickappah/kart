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

const CAMPUSES = [
    'University of Ghana',
    'Kwame Nkrumah University of Science and Technology',
    'University of Cape Coast',
    'University of Professional Studies, Accra',
    'University of Education, Winneba',
    'University of Mines and Technology',
    'University of Health and Allied Sciences',
    'Akenten Appiah-Menka University of Skills Training and Entrepreneurial Development',
    'Catholic University of Ghana',
    'C.K. Tedam University of Technology and Applied Sciences'
];

const CURATED_ADDITIONS = [
    // Arts & Crafts
    { title: 'Winsor & Newton Cotman Watercolor Paint Set (14 Half Pans)', category: 'Arts & Crafts', price: 420, condition: 'New', desc: 'Compact pocket box watercolor set with travel brush and mixing areas. High-quality artist pigments with excellent tinting strength.', img: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=800' },
    { title: 'Sculpey Premo Polymer Clay Starter Kit (12 Colors)', category: 'Arts & Crafts', price: 290, condition: 'New', desc: 'Oven-bake clay set with sculpting tools and texture sheets. Perfect for creating jewelry, beads, and sculpture prototypes.', img: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&q=80&w=800' },
    { title: 'Faber-Castell Polychromos Colored Pencils (Set of 36)', category: 'Arts & Crafts', price: 650, condition: 'New', desc: 'Break-resistant oil-based leads with vibrant, lightfast pigments for professional drawing and illustration.', img: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&q=80&w=800' },
    { title: 'A2 Beechwood Adjustable Table Easel & Storage Drawer', category: 'Arts & Crafts', price: 520, condition: 'Like New', desc: 'Foldable wooden tabletop drawing board with multi-angle adjustment and built-in compartments for brushes and paints.', img: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=800' },
    { title: 'Cricut Joy Compact Vinyl & Paper Cutting Machine', category: 'Arts & Crafts', price: 2100, condition: 'Like New', desc: 'Bluetooth smart cutting machine for custom stickers, dorm wall decals, cards, and custom labels.', img: 'https://images.unsplash.com/photo-1581291518655-9523c932edcf?auto=format&fit=crop&q=80&w=800' },

    // Tickets & Events
    { title: 'Campus Freshers Welcome Rave Party Pass', category: 'Tickets & Events', price: 90, condition: 'New', desc: 'General admission pass with glow merchandise, DJ lineup entry, and access to all interactive booths.', img: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=800' },
    { title: 'Ghana University Debate Championship Delegate Pass', category: 'Tickets & Events', price: 110, condition: 'New', desc: 'Official participant accreditation, competition handbook, lunch catering, and awards banquet ticket.', img: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&q=80&w=800' },
    { title: 'Campus Comedy Night Front Row VIP Ticket', category: 'Tickets & Events', price: 140, condition: 'New', desc: 'VIP seating with complimentary refreshments for the annual inter-hall standup comedy gala.', img: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=800' },
    { title: 'Inter-Collegiate Track & Field Finals Ticket', category: 'Tickets & Events', price: 60, condition: 'New', desc: 'Stadium grandstand seat ticket for the national university athletics track finals.', img: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&q=80&w=800' },

    // Services & Tutoring
    { title: 'Statistics & SPSS/R Data Analysis Consulting', category: 'Services & Tutoring', price: 400, condition: 'New', desc: 'Expert dissertation statistical modeling, hypothesis testing, survey data cleaning, and regression output interpretation.', img: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&q=80&w=800' },
    { title: 'Campus Dorm Moving & Luggage Hauling Service', category: 'Services & Tutoring', price: 280, condition: 'New', desc: 'Same-day van transport, packing assistance, and room-to-room moving support during semester transitions.', img: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800' },
    { title: 'Professional Portrait & Graduation Photoshoot Session', category: 'Services & Tutoring', price: 450, condition: 'New', desc: '1-hour campus photo session with 15 retouched high-resolution digital portraits and gown accessories included.', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800' },
    { title: 'Web Development & Portfolio Website Building Mentorship', category: 'Services & Tutoring', price: 600, condition: 'New', desc: 'Hands-on React & Next.js mentorship to build and deploy your developer portfolio project.', img: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=800' },

    // Sports & Fitness
    { title: 'Adjustable Dumbbell Set (Pair, 2.5kg to 24kg)', category: 'Sports & Fitness', price: 1850, condition: 'Like New', desc: 'Quick-adjust dial dumbbells replace 15 sets of weights. Compact footprint ideal for dorm room workouts.', img: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&q=80&w=800' },
    { title: 'Spalding NBA Official Indoor/Outdoor Basketball', category: 'Sports & Fitness', price: 380, condition: 'New', desc: 'Full ball pebbling for maximum grip and deep channel design for superior control.', img: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=800' },
    { title: 'Manduka PRO Yoga & Pilates Mat (6mm Extra Thick)', category: 'Sports & Fitness', price: 490, condition: 'New', desc: 'Ultra-dense cushioning protects joints, closed-cell material seals out sweat, non-slip textured grip.', img: 'https://images.unsplash.com/photo-1592432678016-e910b452f9a2?auto=format&fit=crop&q=80&w=800' },
    { title: 'Speed Jump Rope with Steel Ball Bearings', category: 'Sports & Fitness', price: 120, condition: 'New', desc: 'Tangle-free steel wire cable with memory foam non-slip handles for cardio training.', img: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=800' }
];

const urlCache = new Map();

async function uploadToSupabaseStorage(url, productId, index = 0) {
    if (!url || typeof url !== 'string') return null;
    if (url.startsWith(SUPABASE_STORAGE_PREFIX)) return url;
    if (urlCache.has(url)) return urlCache.get(url);

    try {
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        if (!res.ok) return url;

        const contentType = res.headers.get('content-type') || 'image/jpeg';
        let ext = 'jpg';
        if (contentType.includes('webp')) ext = 'webp';
        else if (contentType.includes('png')) ext = 'png';
        else if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = 'jpg';

        const buffer = Buffer.from(await res.arrayBuffer());
        const fileName = `${productId}-img${index}-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

        const { error: upErr } = await supabase.storage
            .from('products')
            .upload(fileName, buffer, {
                contentType: contentType.split(';')[0],
                upsert: true
            });

        if (upErr) return url;

        const { data: { publicUrl } } = supabase.storage
            .from('products')
            .getPublicUrl(fileName);

        urlCache.set(url, publicUrl);
        return publicUrl;
    } catch (e) {
        return url;
    }
}

async function run() {
    console.log('🚀 Fetching sellers...');
    const { data: profiles } = await supabase.from('profiles').select('id, campus');
    if (!profiles || profiles.length === 0) {
        console.error('No profiles found');
        process.exit(1);
    }

    console.log('🌐 Fetching catalog sources...');
    const [dummyRes, platziRes, fakeRes] = await Promise.all([
        fetch('https://dummyjson.com/products?limit=0').then(r => r.json()).catch(() => ({ products: [] })),
        fetch('https://api.escuelajs.co/api/v1/products?limit=200').then(r => r.json()).catch(() => []),
        fetch('https://fakestoreapi.com/products').then(r => r.json()).catch(() => [])
    ]);

    const dummyProducts = dummyRes.products || [];
    const platziProducts = Array.isArray(platziRes) ? platziRes : [];
    const fakeProducts = Array.isArray(fakeRes) ? fakeRes : [];

    const pool = [];

    CURATED_ADDITIONS.forEach(c => {
        pool.push({
            title: c.title,
            description: c.desc,
            price: c.price,
            category: c.category,
            condition: c.condition,
            rawImages: [c.img]
        });
    });

    const platziCategoryMap = {
        'Clothes': 'Clothing',
        'Electronics': 'Electronics',
        'Furniture': 'Dorm Furniture',
        'Shoes': 'Clothing',
        'Miscellaneous': 'School Supplies'
    };

    platziProducts.forEach(p => {
        const cleanImgs = (p.images || []).map(img => img.replace(/^[\["\s]+|[\]"\s]+$/g, '')).filter(img => img.startsWith('http'));
        if (cleanImgs.length > 0) {
            const cat = platziCategoryMap[p.category?.name] || 'Clothing';
            const ghsPrice = Math.round((Number(p.price) || 30) * 15.5);
            pool.push({
                title: p.title,
                description: p.description,
                price: ghsPrice < 35 ? 45 : ghsPrice,
                category: cat,
                condition: 'New',
                rawImages: cleanImgs
            });
        }
    });

    const fakeStoreCategoryMap = {
        "men's clothing": 'Clothing',
        "women's clothing": 'Clothing',
        "jewelery": 'Clothing',
        "electronics": 'Electronics'
    };

    fakeProducts.forEach(p => {
        if (p.image) {
            const cat = fakeStoreCategoryMap[p.category] || 'Electronics';
            const ghsPrice = Math.round((Number(p.price) || 25) * 15.5);
            pool.push({
                title: p.title,
                description: p.description,
                price: ghsPrice < 35 ? 50 : ghsPrice,
                category: cat,
                condition: 'New',
                rawImages: [p.image]
            });
        }
    });

    const dummyCatMap = {
        'beauty': 'Beauty & Grooming', 'skin-care': 'Beauty & Grooming', 'fragrances': 'Beauty & Grooming',
        'laptops': 'Electronics', 'smartphones': 'Electronics', 'tablets': 'Electronics', 'mobile-accessories': 'Electronics',
        'furniture': 'Dorm Furniture', 'home-decoration': 'Dorm Furniture', 'kitchen-accessories': 'Kitchenware',
        'sports-accessories': 'Sports & Fitness', 'mens-shirts': 'Clothing', 'mens-shoes': 'Clothing', 'mens-watches': 'Clothing',
        'womens-bags': 'Clothing', 'womens-dresses': 'Clothing', 'womens-jewellery': 'Clothing', 'womens-shoes': 'Clothing',
        'womens-watches': 'Clothing', 'tops': 'Clothing', 'sunglasses': 'Clothing', 'groceries': 'Health & Wellness',
        'motorcycle': 'Home Appliances', 'vehicle': 'Home Appliances'
    };

    dummyProducts.forEach(p => {
        const imgs = (p.images && p.images.length > 0) ? p.images : (p.thumbnail ? [p.thumbnail] : []);
        if (imgs.length > 0) {
            let desc = p.description || '';
            if (p.brand) desc += `\nBrand: ${p.brand}`;
            if (p.warrantyInformation) desc += `\nWarranty: ${p.warrantyInformation}`;
            const ghsPrice = Math.round((Number(p.price) || 20) * 15.5);
            pool.push({
                title: p.title,
                description: desc,
                price: ghsPrice < 30 ? 35 : ghsPrice,
                category: dummyCatMap[p.category] || 'Electronics',
                condition: ['New', 'New', 'Like New', 'Good'][Math.floor(Math.random() * 4)],
                rawImages: imgs
            });
        }
    });

    const targetCount = 300;
    const finalItems = [];
    const conditions = ['New', 'New', 'Like New', 'Good', 'Fair'];
    const modifiers = ['Pro', 'Max', 'Ultra', 'Plus', 'Elite', 'Signature Edition', 'Carbon Black', 'Matte White', 'Compact', 'Standard', 'Original'];

    let poolIndex = 0;
    while (finalItems.length < targetCount) {
        const base = pool[poolIndex % pool.length];
        const iteration = Math.floor(poolIndex / pool.length);

        let itemTitle = base.title;
        if (iteration > 0) {
            const mod = modifiers[(iteration * 3 + poolIndex) % modifiers.length];
            itemTitle = `${base.title} - ${mod}`;
        }

        const profile = profiles[Math.floor(Math.random() * profiles.length)];
        const campus = profile.campus && profile.campus.trim() ? profile.campus.trim() : CAMPUSES[Math.floor(Math.random() * CAMPUSES.length)];
        const condition = conditions[Math.floor(Math.random() * conditions.length)];

        finalItems.push({
            seller_id: profile.id,
            title: itemTitle.length > 80 ? itemTitle.substring(0, 77) + '...' : itemTitle,
            description: base.description,
            price: iteration > 0 ? Math.round(base.price * (1 + (iteration * 0.12))) : base.price,
            category: base.category,
            condition: condition,
            campus: campus,
            currency: 'GHS',
            rawImages: base.rawImages,
            status: 'Active',
            stock_quantity: Math.floor(Math.random() * 10) + 1,
            views_count: Math.floor(Math.random() * 110) + 5,
            likes_count: Math.floor(Math.random() * 22),
            shares_count: Math.floor(Math.random() * 9),
            is_featured: Math.random() > 0.82,
            is_boosted: Math.random() > 0.88
        });

        poolIndex++;
    }

    console.log(`\n⏳ Downloading and storing images in Supabase Storage for ${finalItems.length} products...`);

    const readyToInsert = [];
    const concurrency = 10;

    async function prepareProduct(item, index) {
        const pseudoId = `p300-${Date.now()}-${index}-${Math.random().toString(36).substring(7)}`;
        
        const uploadedImages = [];
        for (let i = 0; i < Math.min(item.rawImages.length, 2); i++) {
            const up = await uploadToSupabaseStorage(item.rawImages[i], pseudoId, i);
            if (up) uploadedImages.push(up);
        }

        const mainImage = uploadedImages[0] || item.rawImages[0] || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=800';

        readyToInsert.push({
            seller_id: item.seller_id,
            title: item.title,
            description: item.description,
            price: item.price,
            category: item.category,
            condition: item.condition,
            campus: item.campus,
            currency: item.currency,
            image_url: mainImage,
            images: uploadedImages.length > 0 ? uploadedImages : [mainImage],
            status: item.status,
            stock_quantity: item.stock_quantity,
            views_count: item.views_count,
            likes_count: item.likes_count,
            shares_count: item.shares_count,
            is_featured: item.is_featured,
            is_boosted: item.is_boosted
        });

        if (readyToInsert.length % 50 === 0 || readyToInsert.length === targetCount) {
            console.log(`Processed ${readyToInsert.length}/${targetCount} products...`);
        }
    }

    for (let i = 0; i < finalItems.length; i += concurrency) {
        const batch = finalItems.slice(i, i + concurrency);
        await Promise.all(batch.map((item, bIdx) => prepareProduct(item, i + bIdx)));
    }

    console.log(`\n📥 Inserting ${readyToInsert.length} products into Supabase...`);

    const insertBatchSize = 25;
    let insertedTotal = 0;

    for (let i = 0; i < readyToInsert.length; i += insertBatchSize) {
        const chunk = readyToInsert.slice(i, i + insertBatchSize);
        const { data, error } = await supabase.from('products').insert(chunk).select('id');
        if (error) {
            console.error(`Insert batch error:`, error.message);
            for (const single of chunk) {
                const { error: sErr } = await supabase.from('products').insert([single]);
                if (!sErr) insertedTotal++;
            }
        } else {
            insertedTotal += (data?.length || chunk.length);
        }
    }

    console.log(`\n🎉 DONE! Successfully added ${insertedTotal} products.`);

    const { count: finalTotal } = await supabase.from('products').select('*', { count: 'exact', head: true });
    console.log(`📊 Total products in database now: ${finalTotal}`);
}

run();
