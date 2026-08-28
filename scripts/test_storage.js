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

async function testStorage() {
    console.log('Testing Supabase storage connection...');
    const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
    console.log('Buckets:', buckets, bErr);

    const testUrl = 'https://cdn.dummyjson.com/product-images/sports-accessories/american-football/thumbnail.webp';
    const res = await fetch(testUrl);
    const buffer = Buffer.from(await res.arrayBuffer());

    const fileName = `test-${Date.now()}.webp`;
    const { data: uploadData, error: upErr } = await supabase.storage
        .from('products')
        .upload(fileName, buffer, {
            contentType: 'image/webp',
            upsert: true
        });

    console.log('Upload result:', uploadData, upErr);

    const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(fileName);

    console.log('Public URL:', publicUrl);

    // Clean up test file
    await supabase.storage.from('products').remove([fileName]);
    console.log('Test file cleaned up.');
}

testStorage();
