
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
function loadEnv() {
    try {
        const envPath = path.resolve(__dirname, '..', '.env.local');
        const envFile = fs.readFileSync(envPath, 'utf8');
        const env = {};
        envFile.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                let value = match[2].trim();
                // Remove quotes if present
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                env[match[1].trim()] = value;
            }
        });
        return env;
    } catch (e) {
        console.error('Error loading .env.local:', e.message);
        return {};
    }
}

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    if (!supabaseUrl) console.error('- NEXT_PUBLIC_SUPABASE_URL is missing');
    if (!supabaseServiceKey) console.error('- SUPABASE_SERVICE_ROLE_KEY is missing');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAdmins() {
    console.log('Checking admin status...');
    console.log('Supabase URL:', supabaseUrl);

    // Check if is_admin column exists by trying to select it from one profile
    const { data: testData, error: testError } = await supabase
        .from('profiles')
        .select('id, is_admin')
        .limit(1);

    if (testError) {
        console.error('Error selecting is_admin (column might not exist):', testError);
    } else {
        console.log('is_admin column accessible.');
    }

    // List all admins
    const { data: admins, error: adminError } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_admin', true);

    if (adminError) {
        console.error('Error fetching admins:', adminError);
    } else {
        console.log(`Found ${admins?.length || 0} admin(s):`);
        if (admins) {
            admins.forEach(admin => {
                console.log(`- ${admin.email} (${admin.display_name}) [ID: ${admin.id}]`);
            });
        }
    }

    // List all users to see if anyone is there
    const { count, error: countError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error('Error counting profiles:', countError);
    } else {
        console.log(`Total profiles in DB: ${count}`);
    }
}

checkAdmins();
