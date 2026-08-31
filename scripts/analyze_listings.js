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

// Exact item titles that are absurd for a campus student marketplace (single fruits/veg, raw meat, basic cutlery, pet food)
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

    // Also check generic multi-thousand dollar motorcycle / vehicle on a campus buy-and-sell
    if (titleLower.includes('motorcycle') || titleLower.includes('kawasaki z800')) {
        return { bad: true, reason: `Unreasonable item for campus ("${p.title}")` };
    }

    return { bad: false };
}

async function audit() {
    const { data: products } = await supabase.from('products').select('*');
    const toRemove = [];
    const keep = [];

    products.forEach(p => {
        const check = isProblematic(p);
        if (check.bad) {
            toRemove.push({ id: p.id, title: p.title, price: p.price, category: p.category, reason: check.reason });
        } else {
            keep.push(p);
        }
    });

    console.log(`\n=== AUDIT REPORT ===`);
    console.log(`Total Products: ${products.length}`);
    console.log(`To Remove: ${toRemove.length}`);
    console.log(`To Keep: ${keep.length}\n`);

    console.log('Sample of items to be removed:');
    toRemove.slice(0, 30).forEach(item => {
        console.log(`- [${item.id}] "${item.title}" (GHS ${item.price}) -> Reason: ${item.reason}`);
    });

    if (toRemove.length > 30) {
        console.log(`... and ${toRemove.length - 30} more.`);
    }
}

audit();
