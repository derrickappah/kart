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

function isSpam(str) {
    if (!str) return true;
    const clean = str.trim().toLowerCase();
    if (clean.length < 4) return true;

    // Check for repetitive consonants like hhrrhrh, nsnsnns, jjejj
    if (/(.)\1{2,}/.test(clean)) return true; // 3 identical chars in a row
    if (/^[b-df-hj-np-tv-z0-9\s]{6,}$/i.test(clean)) return true; // Consonant spam without vowels
    if (/[a-z]{3,}[0-9]+[a-z]+/i.test(clean)) return true; // Mixed letters and digits e.g. "njsjsjejj3"
    if (clean.includes('hdhdhh') || clean.includes('hrrhrh') || clean.includes('nsnns') || clean.includes('ndndn')) return true;

    return false;
}

async function cleanRemainingSpam() {
    const { data: products } = await supabase.from('products').select('*');
    const spamIds = [];

    products.forEach(p => {
        if (isSpam(p.title) || isSpam(p.description)) {
            spamIds.push({ id: p.id, title: p.title, desc: p.description });
        }
    });

    console.log(`Found ${spamIds.length} spam/test listings:`);
    spamIds.forEach(s => console.log(`- [${s.id}] Title: "${s.title}", Desc: "${s.desc}"`));

    if (spamIds.length > 0) {
        const ids = spamIds.map(s => s.id);
        const { error } = await supabase.from('products').delete().in('id', ids);
        if (error) console.error('Delete error:', error.message);
        else console.log(`Deleted ${spamIds.length} spam listings.`);
    }

    const { count } = await supabase.from('products').select('*', { count: 'exact', head: true });
    console.log(`Total final cleaned products: ${count}`);
}

cleanRemainingSpam();
