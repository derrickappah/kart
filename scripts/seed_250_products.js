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

const CATEGORIES = [
    'Textbooks', 'Electronics', 'Dorm Furniture', 'Clothing', 'School Supplies',
    'Tickets & Events', 'Services & Tutoring', 'Beauty & Grooming', 'Sports & Fitness',
    'Kitchenware', 'Musical Instruments', 'Games & Consoles', 'Health & Wellness',
    'Arts & Crafts', 'Home Appliances'
];

const CURATED_EXPANSION = [
    // Textbooks
    { title: 'Campbell Biology (12th Edition)', category: 'Textbooks', price: 350, condition: 'Like New', desc: 'Authoritative biology textbook with full-color diagrams, practice questions, and study access code.', img: 'https://images.unsplash.com/photo-1532012164546-f432f2e3777a?auto=format&fit=crop&q=80&w=800' },
    { title: 'Principles of Neural Science (Kandel)', category: 'Textbooks', price: 420, condition: 'New', desc: 'Definitive guide to neuroscience and brain physiology for medical and psychology coursework.', img: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=800' },
    { title: 'Introduction to Algorithms (CLRS 4th Edition)', category: 'Textbooks', price: 380, condition: 'New', desc: 'The bible of computer science algorithms and data structures. Clear proofs, pseudocode, and practice exercises.', img: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=800' },
    { title: 'Corporate Finance (Brealey, Myers, Allen)', category: 'Textbooks', price: 290, condition: 'Good', desc: 'Standard business and finance textbook covering valuation, capital structure, and risk management.', img: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=800' },
    { title: 'Fundamentals of Physics (Halliday & Resnick)', category: 'Textbooks', price: 310, condition: 'Like New', desc: 'Covers mechanics, thermodynamics, electromagnetism, and optics with solved problem sets.', img: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=800' },
    { title: 'Modern Operating Systems (Tanenbaum)', category: 'Textbooks', price: 270, condition: 'Like New', desc: 'In-depth coverage of processes, threads, memory management, file systems, and virtualization.', img: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=800' },
    { title: 'Diagnostic and Statistical Manual DSM-5-TR', category: 'Textbooks', price: 450, condition: 'New', desc: 'Latest desk reference edition for psychology, nursing, and medical students.', img: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=800' },
    { title: 'Engineering Mechanics: Statics & Dynamics', category: 'Textbooks', price: 330, condition: 'Good', desc: 'Hibbeler 14th edition textbook for civil and mechanical engineering introductory courses.', img: 'https://images.unsplash.com/photo-1495640388908-05fa85288e61?auto=format&fit=crop&q=80&w=800' },

    // Games & Consoles
    { title: 'Xbox Wireless Controller Robot White', category: 'Games & Consoles', price: 950, condition: 'New', desc: 'Textured grip on triggers and bumpers, hybrid D-pad, button mapping, and 3.5mm audio headset jack.', img: 'https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?auto=format&fit=crop&q=80&w=800' },
    { title: 'EA SPORTS FC 25 (PS5 Edition)', category: 'Games & Consoles', price: 780, condition: 'New', desc: 'Brand new sealed disc with 5v5 Rush mode, overhauled tactics, and updated global rosters.', img: 'https://images.unsplash.com/photo-1612287233207-6f6d0fcf9c58?auto=format&fit=crop&q=80&w=800' },
    { title: 'Nintendo Switch Pro Controller', category: 'Games & Consoles', price: 850, condition: 'Like New', desc: 'Premium controller with motion controls, HD rumble, built-in amiibo functionality, and USB-C charging.', img: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&q=80&w=800' },
    { title: 'Steam Deck 512GB Handheld Gaming Console', category: 'Games & Consoles', price: 5800, condition: 'Like New', desc: 'High-speed NVMe SSD storage, anti-glare etched glass screen, carrying case, and full Steam library access.', img: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=800' },
    { title: 'Logitech G29 Driving Force Racing Wheel & Pedals', category: 'Games & Consoles', price: 3200, condition: 'Good', desc: 'Dual-motor force feedback, responsive stainless steel floor pedals, 900-degree rotation for PS5 and PC.', img: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&q=80&w=800' },

    // Musical Instruments
    { title: 'Fender Squier Stratocaster Electric Guitar', category: 'Musical Instruments', price: 2400, condition: 'Like New', desc: 'Classic Stratocaster tone with three single-coil pickups, synchronized tremolo bridge, and maple neck.', img: 'https://images.unsplash.com/photo-1516924962500-2b4b3b99ea02?auto=format&fit=crop&q=80&w=800' },
    { title: 'Roland Go:Keys 61-Key Music Creation Keyboard', category: 'Musical Instruments', price: 2900, condition: 'New', desc: 'Loop mix function with 500 pro sounds, Bluetooth audio/MIDI, built-in speakers, and battery operation.', img: 'https://images.unsplash.com/photo-1520523839898-50712825e3a7?auto=format&fit=crop&q=80&w=800' },
    { title: 'Audio-Technica AT2020 Cardioid Condenser Studio Mic', category: 'Musical Instruments', price: 1250, condition: 'New', desc: 'Ideal for podcasting, vocal recording, and home studio music production with exceptional dynamic range.', img: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&q=80&w=800' },
    { title: 'Focusrite Scarlett 2i2 4th Gen USB Audio Interface', category: 'Musical Instruments', price: 1850, condition: 'New', desc: 'Ultra-low noise mic preamps, 120dB dynamic range, auto gain, and clip safe recording for Mac and PC.', img: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=800' },
    { title: 'Kala Soprano Ukulele Mahogany Satin', category: 'Musical Instruments', price: 650, condition: 'New', desc: 'Traditional mahogany soprano ukulele with walnut fingerboard and Aquila Super Nylgut strings.', img: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&q=80&w=800' },

    // Dorm Furniture
    { title: 'Ergonomic Mesh Swivel Office & Study Chair', category: 'Dorm Furniture', price: 1200, condition: 'New', desc: 'Breathable mesh high back, adjustable lumbar support, 3D flip-up armrests, and smooth rolling casters.', img: 'https://images.unsplash.com/photo-1580481077195-c3a824452e70?auto=format&fit=crop&q=80&w=800' },
    { title: 'Foldable Study Desk with Bookshelf (Dark Walnut)', category: 'Dorm Furniture', price: 750, condition: 'New', desc: 'Space-saving folding desk requires zero assembly. Sturdy metal frame with scratch-resistant waterproof surface.', img: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&q=80&w=800' },
    { title: 'Heavy Duty 4-Tier Metal Storage Shelving Unit', category: 'Dorm Furniture', price: 620, condition: 'New', desc: 'Adjustable wire shelf rack holds up to 250kg total load. Rust-resistant chrome finish for dorm rooms.', img: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&q=80&w=800' },
    { title: 'LED Modern Desk Lamp with Wireless Charging Base', category: 'Dorm Furniture', price: 290, condition: 'New', desc: '5 lighting modes, 10 brightness levels, USB charging port, built-in Qi fast wireless charging pad, and 1h timer.', img: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&q=80&w=800' },
    { title: 'Memory Foam Orthopedic Mattress Topper (Queen/Twin XL)', category: 'Dorm Furniture', price: 850, condition: 'New', desc: 'Cooling gel-infused memory foam topper relieves pressure points and conforms to your body for dorm beds.', img: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&q=80&w=800' },

    // Electronics
    { title: 'Apple MacBook Air M2 (13.6-inch, 256GB SSD, Midnight)', category: 'Electronics', price: 13500, condition: 'Like New', desc: 'Liquid Retina display, 8-core CPU, up to 18 hours battery life, 1080p FaceTime HD camera, MagSafe charging.', img: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=800' },
    { title: 'Sony WH-1000XM5 Wireless Noise-Canceling Headphones', category: 'Electronics', price: 3800, condition: 'New', desc: 'Industry-leading noise cancellation with 8 microphones, 30-hour battery life, ultra-comfortable lightweight design.', img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800' },
    { title: 'Dell UltraSharp 27-inch 4K USB-C Hub Monitor', category: 'Electronics', price: 4200, condition: 'Like New', desc: 'IPS Black technology with 2000:1 contrast ratio, 90W power delivery over USB-C, RJ45 Ethernet, and DisplayPort.', img: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&q=80&w=800' },
    { title: 'Logitech MX Master 3S Wireless Performance Mouse', category: 'Electronics', price: 1100, condition: 'New', desc: 'Quiet clicks, 8K DPI any-surface tracking, MagSpeed electromagnetic scrolling, and ergonomic thumb rest.', img: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&q=80&w=800' },
    { title: 'Anker 737 Power Bank 24,000mAh (PowerCore 24K)', category: 'Electronics', price: 1400, condition: 'New', desc: '140W fast two-way charging with smart digital display. Powerful enough to charge laptops and phones simultaneously.', img: 'https://images.unsplash.com/photo-1609592426868-80f089f2f81d?auto=format&fit=crop&q=80&w=800' },
    { title: 'Samsung Galaxy Watch 6 Classic 47mm (Bluetooth)', category: 'Electronics', price: 3100, condition: 'Like New', desc: 'Rotating bezel, sapphire crystal glass, advanced sleep coaching, ECG, and body composition analysis.', img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800' },
    { title: 'Kindle Paperwhite 16GB (6.8-inch display)', category: 'Electronics', price: 1650, condition: 'New', desc: 'Adjustable warm light, waterproof IPX8 design, weeks of battery life, and glare-free 300 ppi paper-like display.', img: 'https://images.unsplash.com/photo-1592496001020-d31bd830651f?auto=format&fit=crop&q=80&w=800' },

    // Home Appliances
    { title: 'Ninja Air Fryer Pro 4-in-1 (5-Quart Capacity)', category: 'Home Appliances', price: 1450, condition: 'New', desc: 'Air fry, roast, reheat, and dehydrate. Non-stick ceramic coated basket, wide temperature range up to 210°C.', img: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&q=80&w=800' },
    { title: 'NutriBullet Pro 900W Personal Blender Set', category: 'Home Appliances', price: 980, condition: 'New', desc: 'High-speed extractor blades crush fruits, seeds, and ice in seconds. Includes to-go cups and seal lids.', img: 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&q=80&w=800' },
    { title: 'Rowenta Compact Steam Iron 1700W', category: 'Home Appliances', price: 480, condition: 'New', desc: 'Stainless steel soleplate with 300 microholes for even steam distribution. Anti-drip and auto shut-off safety.', img: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&q=80&w=800' },

    // Services & Tutoring
    { title: 'Python & Data Science Final Project Guidance', category: 'Services & Tutoring', price: 500, condition: 'New', desc: '8 hours of comprehensive coding mentoring for pandas, numpy, machine learning models, and thesis data visualization.', img: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=800' },
    { title: 'Graphic Design & Resume/CV Branding Package', category: 'Services & Tutoring', price: 250, condition: 'New', desc: 'Professional ATS-friendly modern resume makeover, LinkedIn profile optimization, and portfolio PDF layout.', img: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=800' },
    { title: 'Campus Laundry & Dry Cleaning Bi-Weekly Subscription', category: 'Services & Tutoring', price: 320, condition: 'New', desc: 'Doorstep dorm pickup and delivery twice a week. Includes wash, tumble dry, delicate fabric care, and crisp folding.', img: 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&q=80&w=800' },

    // Tickets & Events
    { title: 'Annual Inter-Hall Basketball Finals Courtside Ticket', category: 'Tickets & Events', price: 80, condition: 'New', desc: 'Prime courtside seating for the championship finale. Includes tournament merchandise towel and energy drinks.', img: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=800' },
    { title: 'TEDx Campus Student Conference All-Day Pass', category: 'Tickets & Events', price: 120, condition: 'New', desc: 'Full access to 10 guest keynote speeches, networking lunch, interactive workshops, and conference swag bag.', img: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&q=80&w=800' },

    // School Supplies
    { title: 'Staedtler Mars Drafting & Architectural Scale Set', category: 'School Supplies', price: 260, condition: 'New', desc: 'High-precision aluminum triangular scale ruler, technical compass set, and mechanical drafting pencils.', img: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&q=80&w=800' },
    { title: 'Moleskine Classic Expanded Hardcover Notebook (400 Pages)', category: 'School Supplies', price: 210, condition: 'New', desc: 'Thick acid-free ivory pages with expandable inner pocket, ribbon bookmark, and elastic closure band.', img: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=800' }
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

    console.log('🌐 Fetching data sources...');
    const [dummyRes, platziRes, fakeRes] = await Promise.all([
        fetch('https://dummyjson.com/products?limit=0').then(r => r.json()).catch(() => ({ products: [] })),
        fetch('https://api.escuelajs.co/api/v1/products?limit=200').then(r => r.json()).catch(() => []),
        fetch('https://fakestoreapi.com/products').then(r => r.json()).catch(() => [])
    ]);

    const dummyProducts = dummyRes.products || [];
    const platziProducts = Array.isArray(platziRes) ? platziRes : [];
    const fakeProducts = Array.isArray(fakeRes) ? fakeRes : [];

    console.log(`Fetched sources: ${dummyProducts.length} DummyJSON, ${platziProducts.length} Platzi, ${fakeProducts.length} FakeStore`);

    const pool = [];

    // 1. Add curated items
    CURATED_EXPANSION.forEach(c => {
        pool.push({
            title: c.title,
            description: c.desc,
            price: c.price,
            category: c.category,
            condition: c.condition,
            rawImages: [c.img]
        });
    });

    // 2. Add Platzi items
    const platziCategoryMap = {
        'Clothes': 'Clothing',
        'Electronics': 'Electronics',
        'Furniture': 'Dorm Furniture',
        'Shoes': 'Clothing',
        'Miscellaneous': 'School Supplies'
    };

    platziProducts.forEach(p => {
        const cleanImgs = (p.images || []).map(img => {
            // Clean up possible stringified arrays in Platzi API
            return img.replace(/^[\["\s]+|[\]"\s]+$/g, '');
        }).filter(img => img.startsWith('http'));

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

    // 3. Add FakeStore items
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

    // 4. Add DummyJSON items
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

    console.log(`Total candidate products pool: ${pool.length}`);

    // Shuffle pool to pick 250 items (if pool < 250, generate variations)
    const targetCount = 250;
    const finalItems = [];
    const conditions = ['New', 'New', 'Like New', 'Good', 'Fair'];

    // Fill up to 250 items
    let poolIndex = 0;
    while (finalItems.length < targetCount) {
        const base = pool[poolIndex % pool.length];
        const iteration = Math.floor(poolIndex / pool.length);

        let itemTitle = base.title;
        if (iteration > 0) {
            const modifiers = ['Pro Edition', 'Deluxe Bundle', 'Special Edition', 'Series 2', 'Plus Pack', 'Upgraded', 'Value Pack'];
            const mod = modifiers[(iteration + poolIndex) % modifiers.length];
            itemTitle = `${base.title} (${mod})`;
        }

        const profile = profiles[Math.floor(Math.random() * profiles.length)];
        const campus = profile.campus && profile.campus.trim() ? profile.campus.trim() : CAMPUSES[Math.floor(Math.random() * CAMPUSES.length)];
        const condition = conditions[Math.floor(Math.random() * conditions.length)];

        finalItems.push({
            seller_id: profile.id,
            title: itemTitle.length > 80 ? itemTitle.substring(0, 77) + '...' : itemTitle,
            description: base.description,
            price: iteration > 0 ? Math.round(base.price * (1 + (iteration * 0.15))) : base.price,
            category: base.category,
            condition: condition,
            campus: campus,
            currency: 'GHS',
            rawImages: base.rawImages,
            status: 'Active',
            stock_quantity: Math.floor(Math.random() * 12) + 1,
            views_count: Math.floor(Math.random() * 100) + 5,
            likes_count: Math.floor(Math.random() * 20),
            shares_count: Math.floor(Math.random() * 8),
            is_featured: Math.random() > 0.82,
            is_boosted: Math.random() > 0.88
        });

        poolIndex++;
    }

    console.log(`\n⏳ Beginning parallel download & Supabase Storage upload for ${finalItems.length} products...`);

    const readyToInsert = [];
    const concurrency = 8;

    async function prepareProduct(item, index) {
        const pseudoId = `p${Date.now()}-${index}-${Math.random().toString(36).substring(7)}`;
        
        // Upload images to Supabase
        const uploadedImages = [];
        for (let i = 0; i < Math.min(item.rawImages.length, 3); i++) {
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

        if (readyToInsert.length % 25 === 0 || readyToInsert.length === targetCount) {
            console.log(`Processed ${readyToInsert.length}/${targetCount} products...`);
        }
    }

    for (let i = 0; i < finalItems.length; i += concurrency) {
        const batch = finalItems.slice(i, i + concurrency);
        await Promise.all(batch.map((item, bIdx) => prepareProduct(item, i + bIdx)));
    }

    console.log(`\n📥 Inserting ${readyToInsert.length} products into Supabase 'products' table...`);

    const insertBatchSize = 25;
    let insertedTotal = 0;

    for (let i = 0; i < readyToInsert.length; i += insertBatchSize) {
        const chunk = readyToInsert.slice(i, i + insertBatchSize);
        const { data, error } = await supabase.from('products').insert(chunk).select('id');
        if (error) {
            console.error(`Insert batch error:`, error.message);
            // Fallback single insert
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

    // Category breakdown
    const { data: allProducts } = await supabase.from('products').select('category');
    const counts = {};
    allProducts?.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1; });
    console.log('\n📂 Complete Category Breakdown:');
    Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
        console.log(`  - ${k}: ${v}`);
    });
}

run();
