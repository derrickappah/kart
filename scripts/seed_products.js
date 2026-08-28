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

const CATEGORY_MAPPING = {
    'beauty': 'Beauty & Grooming',
    'skin-care': 'Beauty & Grooming',
    'fragrances': 'Beauty & Grooming',
    'laptops': 'Electronics',
    'smartphones': 'Electronics',
    'tablets': 'Electronics',
    'mobile-accessories': 'Electronics',
    'furniture': 'Dorm Furniture',
    'home-decoration': 'Dorm Furniture',
    'kitchen-accessories': 'Kitchenware',
    'sports-accessories': 'Sports & Fitness',
    'mens-shirts': 'Clothing',
    'mens-shoes': 'Clothing',
    'mens-watches': 'Clothing',
    'womens-bags': 'Clothing',
    'womens-dresses': 'Clothing',
    'womens-jewellery': 'Clothing',
    'womens-shoes': 'Clothing',
    'womens-watches': 'Clothing',
    'tops': 'Clothing',
    'sunglasses': 'Clothing',
    'groceries': 'Health & Wellness',
    'motorcycle': 'Home Appliances',
    'vehicle': 'Home Appliances'
};

const EXTRA_PRODUCTS = [
    {
        title: 'Calculus: Early Transcendentals (9th Edition)',
        description: 'Comprehensive college mathematics textbook by James Stewart. Essential for engineering, science, and math students. Includes problem sets, solutions, and clear visual diagrams.',
        category: 'Textbooks',
        price: 320,
        condition: 'Like New',
        image_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=1000',
        images: [
            'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=1000',
            'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=1000'
        ]
    },
    {
        title: 'Organic Chemistry Structure and Function (8th Edition)',
        description: 'Hardcover textbook for pre-med and chemistry majors. Clean pages, no highlights, includes molecular structure reference charts.',
        category: 'Textbooks',
        price: 280,
        condition: 'Good',
        image_url: 'https://images.unsplash.com/photo-1532012164546-f432f2e3777a?auto=format&fit=crop&q=80&w=1000',
        images: [
            'https://images.unsplash.com/photo-1532012164546-f432f2e3777a?auto=format&fit=crop&q=80&w=1000'
        ]
    },
    {
        title: 'Economics Principles and Applications (Mankiw)',
        description: 'Standard textbook for Principles of Microeconomics and Macroeconomics. Great condition with study notes included.',
        category: 'Textbooks',
        price: 250,
        condition: 'Good',
        image_url: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=1000',
        images: [
            'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=1000'
        ]
    },
    {
        title: 'Sony PlayStation 5 Wireless Controller DualSense',
        description: 'Original PS5 DualSense Wireless Controller in Midnight Black. Features haptic feedback, adaptive triggers, and built-in microphone.',
        category: 'Games & Consoles',
        price: 1100,
        condition: 'New',
        image_url: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&q=80&w=1000',
        images: [
            'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&q=80&w=1000',
            'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&q=80&w=1000'
        ]
    },
    {
        title: 'Nintendo Switch OLED Neon Red/Blue Edition',
        description: 'Vibrant 7-inch OLED screen, 64GB internal storage, enhanced audio, wide adjustable stand. Comes with docking station and joy-cons.',
        category: 'Games & Consoles',
        price: 4500,
        condition: 'Like New',
        image_url: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&q=80&w=1000',
        images: [
            'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&q=80&w=1000'
        ]
    },
    {
        title: 'Casio CT-S300 61-Key Portable Keyboard Piano',
        description: 'Touch-sensitive keyboard with pitch bend wheel, 400 tones, 77 rhythms, USB-MIDI connectivity, and headphone jack for silent dorm practice.',
        category: 'Musical Instruments',
        price: 2200,
        condition: 'Like New',
        image_url: 'https://images.unsplash.com/photo-1520523839898-50712825e3a7?auto=format&fit=crop&q=80&w=1000',
        images: [
            'https://images.unsplash.com/photo-1520523839898-50712825e3a7?auto=format&fit=crop&q=80&w=1000'
        ]
    },
    {
        title: 'Yamaha F310 Acoustic Guitar Natural Wood',
        description: 'Outstanding quality traditional Western body acoustic guitar. Spruce top with rosewood fingerboard. Includes gig bag and spare strings.',
        category: 'Musical Instruments',
        price: 1800,
        condition: 'Good',
        image_url: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&q=80&w=1000',
        images: [
            'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&q=80&w=1000'
        ]
    },
    {
        title: 'Midterm & Final Exam Peer Tutoring Package (Calculus & Stats)',
        description: 'One-on-one virtual or in-person 10-hour tutoring package by a 4th-year First Class Engineering student. Includes previous exam breakdowns and personalized revision guides.',
        category: 'Services & Tutoring',
        price: 450,
        condition: 'New',
        image_url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=1000',
        images: [
            'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=1000'
        ]
    },
    {
        title: 'Campus Hall Week Mega Concert VIP Ticket Pass',
        description: 'Official VIP Ticket for the upcoming Annual Campus Music Fest. Includes front row stage access, complimentary merchandise, and fast-track entrance.',
        category: 'Tickets & Events',
        price: 150,
        condition: 'New',
        image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=1000',
        images: [
            'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=1000'
        ]
    },
    {
        title: 'Professional Acrylic Paint Set & Canvas Kit (24 Colors)',
        description: 'Complete studio art kit with 24 vibrant acrylic paint tubes, 6 artist brushes, mixing palette, and two 12x16 stretched canvas boards. Perfect for architecture and fine arts coursework.',
        category: 'Arts & Crafts',
        price: 380,
        condition: 'New',
        image_url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=1000',
        images: [
            'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=1000'
        ]
    },
    {
        title: 'TI-84 Plus CE Color Graphing Calculator',
        description: 'High-resolution backlit color screen with rechargeable battery. Pre-loaded with apps and images. Approved for SAT, ACT, and university calculus and statistics exams.',
        category: 'School Supplies',
        price: 1450,
        condition: 'Like New',
        image_url: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?auto=format&fit=crop&q=80&w=1000',
        images: [
            'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?auto=format&fit=crop&q=80&w=1000'
        ]
    },
    {
        title: 'Oxford Deluxe Hardcover Notebooks & Pen Gift Set',
        description: 'Set of 3 A5 dotted grid hardcover journals with thick 120gsm bleed-proof paper, ribbon bookmarks, and a precision metal gel rollerball pen.',
        category: 'School Supplies',
        price: 190,
        condition: 'New',
        image_url: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&q=80&w=1000',
        images: [
            'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&q=80&w=1000'
        ]
    },
    {
        title: 'Compact Dorm Mini Fridge & Freezer (90L)',
        description: 'Energy-saving double door mini refrigerator with freezer compartment. Quiet 38dB compressor, adjustable thermostat, reversible door, and interior LED lighting.',
        category: 'Home Appliances',
        price: 2400,
        condition: 'New',
        image_url: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&q=80&w=1000',
        images: [
            'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&q=80&w=1000'
        ]
    },
    {
        title: 'Philips 1.7L Stainless Steel Fast Boil Electric Kettle',
        description: 'Cordless rapid boil kettle with concealed heating element, auto shut-off, and boil-dry protection. Durable food-grade stainless steel body.',
        category: 'Home Appliances',
        price: 340,
        condition: 'New',
        image_url: 'https://images.unsplash.com/photo-1594213114663-d94db9b17125?auto=format&fit=crop&q=80&w=1000',
        images: [
            'https://images.unsplash.com/photo-1594213114663-d94db9b17125?auto=format&fit=crop&q=80&w=1000'
        ]
    }
];

async function seedDatabase() {
    console.log('🚀 Fetching sellers from Supabase...');
    const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, email, display_name, campus');
    if (pErr || !profiles || profiles.length === 0) {
        console.error('Failed to get profiles:', pErr);
        process.exit(1);
    }
    console.log(`Found ${profiles.length} seller profiles to distribute products across.`);

    console.log('🌐 Fetching product catalog from DummyJSON / Amazon-style catalog API...');
    const res = await fetch('https://dummyjson.com/products?limit=194');
    const data = await res.json();
    const rawProducts = data.products || [];

    console.log(`Fetched ${rawProducts.length} raw products.`);

    // Shuffle and pick
    const shuffled = rawProducts.sort(() => 0.5 - Math.random());
    
    const formattedProducts = [];
    const conditions = ['New', 'New', 'New', 'Like New', 'Good', 'Fair'];

    // First add the curated specialty campus products
    for (const extra of EXTRA_PRODUCTS) {
        const randomProfile = profiles[Math.floor(Math.random() * profiles.length)];
        const randomCampus = randomProfile.campus && randomProfile.campus.trim() 
            ? randomProfile.campus.trim() 
            : CAMPUSES[Math.floor(Math.random() * CAMPUSES.length)];
        
        formattedProducts.push({
            seller_id: randomProfile.id,
            title: extra.title,
            description: extra.description,
            price: extra.price,
            category: extra.category,
            condition: extra.condition,
            image_url: extra.image_url,
            images: extra.images,
            status: 'Active',
            campus: randomCampus,
            currency: 'GHS',
            stock_quantity: Math.floor(Math.random() * 8) + 1,
            views_count: Math.floor(Math.random() * 90) + 10,
            likes_count: Math.floor(Math.random() * 20),
            shares_count: Math.floor(Math.random() * 8),
            is_featured: Math.random() > 0.8,
            is_boosted: Math.random() > 0.85
        });
    }

    // Now convert products from DummyJSON until we reach 100 products
    for (const p of shuffled) {
        if (formattedProducts.length >= 100) break;

        const mappedCategory = CATEGORY_MAPPING[p.category] || 'Electronics';
        const randomProfile = profiles[Math.floor(Math.random() * profiles.length)];
        const randomCampus = randomProfile.campus && randomProfile.campus.trim() 
            ? randomProfile.campus.trim() 
            : CAMPUSES[Math.floor(Math.random() * CAMPUSES.length)];
        
        const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
        
        // Convert USD price to realistic GHS price (e.g. rate of ~15, rounded nicely)
        const usdPrice = Number(p.price) || 20;
        let ghsPrice = Math.round(usdPrice * 15.5);
        if (ghsPrice < 25) ghsPrice = 30;

        // Clean up title & description
        const title = p.title.length > 80 ? p.title.substring(0, 77) + '...' : p.title;
        let desc = p.description;
        if (p.brand) {
            desc += `\n\nBrand: ${p.brand}`;
        }
        if (p.warrantyInformation) {
            desc += `\nWarranty: ${p.warrantyInformation}`;
        }
        if (p.shippingInformation) {
            desc += `\nShipping: ${p.shippingInformation}`;
        }
        if (p.dimensions) {
            desc += `\nDimensions: ${p.dimensions.width} x ${p.dimensions.height} x ${p.dimensions.depth} cm`;
        }

        const imagesList = (p.images && p.images.length > 0) ? p.images : [p.thumbnail];
        const mainImage = p.thumbnail || imagesList[0];

        formattedProducts.push({
            seller_id: randomProfile.id,
            title: title,
            description: desc,
            price: ghsPrice,
            category: mappedCategory,
            condition: randomCondition,
            image_url: mainImage,
            images: imagesList,
            status: 'Active',
            campus: randomCampus,
            currency: 'GHS',
            stock_quantity: p.stock || Math.floor(Math.random() * 10) + 1,
            views_count: Math.floor(Math.random() * 120) + 5,
            likes_count: Math.floor(Math.random() * 25),
            shares_count: Math.floor(Math.random() * 10),
            is_featured: Math.random() > 0.8,
            is_boosted: Math.random() > 0.85
        });
    }

    console.log(`📦 Prepared ${formattedProducts.length} complete products to insert into the database.`);

    // Insert in batches of 25
    const batchSize = 25;
    let insertedTotal = 0;

    for (let i = 0; i < formattedProducts.length; i += batchSize) {
        const batch = formattedProducts.slice(i, i + batchSize);
        console.log(`Inserting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(formattedProducts.length / batchSize)} (${batch.length} items)...`);
        
        const { data, error } = await supabase.from('products').insert(batch).select('id');
        if (error) {
            console.error('Error inserting batch:', error);
            // Try inserting one by one in this batch to identify any offending item
            for (const item of batch) {
                const { error: singleErr } = await supabase.from('products').insert([item]);
                if (singleErr) {
                    console.error('Failed single item insert:', item.title, singleErr.message);
                } else {
                    insertedTotal++;
                }
            }
        } else {
            insertedTotal += (data?.length || batch.length);
        }
    }

    console.log(`\n🎉 Success! Successfully inserted ${insertedTotal} products into the database.`);

    // Verify final count
    const { count: finalCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
    console.log(`📊 Total products in database now: ${finalCount}`);

    // Print breakdown by category
    const { data: allCategoryStats } = await supabase.from('products').select('category');
    const catCounts = {};
    allCategoryStats?.forEach(p => {
        catCounts[p.category] = (catCounts[p.category] || 0) + 1;
    });
    console.log('\n📂 Product Breakdown by Category:');
    Object.entries(catCounts).sort((a, b) => b[1] - a[1]).forEach(([cat, cnt]) => {
        console.log(`  - ${cat}: ${cnt}`);
    });
}

seedDatabase();
