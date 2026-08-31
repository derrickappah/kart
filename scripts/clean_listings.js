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

const GIBBERISH_PATTERNS = [
    /^[a-z0-9]{1,2}$/i,
    /^[;,\.\s\-_\+]+$/,
    /[a-z]{5,};[a-z]{3,}/i,
    /^test\b/i,
    /^asdf/i,
    /^qwerty/i,
    /^foo\b|^bar\b/i
];

const UNREASONABLE_EXACT_TITLES = new Set([
    'apple', 'lemon', 'cucumber', 'potatoes', 'red onions', 'kiwi', 'water',
    'beef steak', 'chicken meat', 'cooking oil', 'fork', 'plate', 'glass',
    'fine mesh strainer', 'slotted turner', 'grater black', 'bamboo spatula',
    'knife', 'dog food', 'cat food', 'tissue paper box', 'powder canister',
    'shoe'
]);

function isProblematic(p) {
    const titleTrim = (p.title || '').trim();
    const descTrim = (p.description || '').trim();
    const titleLower = titleTrim.toLowerCase();

    // 1. Gibberish / Test
    if (GIBBERISH_PATTERNS.some(pat => pat.test(titleTrim) || pat.test(descTrim))) {
        return { bad: true, reason: 'Gibberish/Test listing' };
    }
    if (titleTrim.length < 3 || descTrim.length < 3) {
        return { bad: true, reason: 'Too short / Empty content' };
    }

    // 2. Broken or missing images
    if (!p.image_url || p.image_url.trim() === '' || !p.images || p.images.length === 0) {
        return { bad: true, reason: 'Broken/Missing images' };
    }

    // 3. Unreasonable luxury / extreme prices (> GHS 30,000 for student platform)
    if (p.price <= 0 || p.price > 30000) {
        return { bad: true, reason: `Unreasonable price (GHS ${p.price})` };
    }

    // 4. Exact match raw groceries & basic cutlery
    if (UNREASONABLE_EXACT_TITLES.has(titleLower)) {
        return { bad: true, reason: `Unreasonable campus item ("${p.title}")` };
    }

    // 5. Motorbikes / heavy vehicles on campus platform
    if (titleLower.includes('motorcycle') || titleLower.includes('kawasaki z800')) {
        return { bad: true, reason: `Unreasonable item for campus ("${p.title}")` };
    }

    return { bad: false };
}

async function removeProblematicListings() {
    console.log('🔍 Fetching all products...');
    const { data: products, error } = await supabase.from('products').select('*');

    if (error) {
        console.error('Error fetching products:', error);
        return;
    }

    const toDeleteIds = [];
    products.forEach(p => {
        const check = isProblematic(p);
        if (check.bad) {
            toDeleteIds.push(p.id);
        }
    });

    console.log(`Found ${toDeleteIds.length} listings to remove out of ${products.length} total.`);

    if (toDeleteIds.length === 0) {
        console.log('No listings to delete.');
        return;
    }

    // Delete in batches of 20
    let deletedCount = 0;
    const batchSize = 20;

    for (let i = 0; i < toDeleteIds.length; i += batchSize) {
        const batch = toDeleteIds.slice(i, i + batchSize);
        const { error: delErr } = await supabase
            .from('products')
            .delete()
            .in('id', batch);

        if (delErr) {
            console.error('Batch delete error:', delErr.message);
            // Delete one by one as fallback
            for (const id of batch) {
                const { error: singleErr } = await supabase.from('products').delete().eq('id', id);
                if (!singleErr) deletedCount++;
                else console.error(`Failed to delete ${id}:`, singleErr.message);
            }
        } else {
            deletedCount += batch.length;
        }
    }

    console.log(`\n🎉 Successfully removed ${deletedCount} fake, broken, and unreasonable listings.`);

    // Verify remaining count
    const { count: finalCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
    console.log(`📊 Cleaned database product count: ${finalCount}`);

    // Category breakdown of remaining products
    const { data: remaining } = await supabase.from('products').select('category');
    const counts = {};
    remaining?.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1; });
    console.log('\n📂 Remaining Clean Products by Category:');
    Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
        console.log(`  - ${k}: ${v}`);
    });
}

removeProblematicListings();
