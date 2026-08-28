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

async function run() {
    const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, email, display_name, campus');
    console.log('Profiles:', JSON.stringify(profiles, null, 2));

    const { data: sampleProducts, error: prErr } = await supabase.from('products').select('*').order('created_at', { ascending: false }).limit(3);
    console.log('Latest Seeded Products:', JSON.stringify(sampleProducts, null, 2));

    const { count, error: cErr } = await supabase.from('products').select('*', { count: 'exact', head: true });
    console.log('Total Products Count:', count);
}

run();
