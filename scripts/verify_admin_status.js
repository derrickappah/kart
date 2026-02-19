const fs = require('fs');
const path = require('path');

// Simple .env.local parser
function loadEnv() {
    try {
        const envPath = path.resolve(__dirname, '../.env.local');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const env = {};
        envContent.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^['"]|['"]$/g, '');
                env[key] = value;
            }
        });
        return env;
    } catch (e) {
        console.error('Could not read .env.local', e);
        return {};
    }
}

const env = loadEnv();
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Missing env vars:', {
        url: !!SUPABASE_URL,
        key: !!SERVICE_KEY,
        path: path.resolve(__dirname, '../.env.local')
    });
    process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function checkAdmins() {
    console.log('Checking for admin users...');
    console.log('URL:', SUPABASE_URL);
    // don't log the full key for security, just prefix
    console.log('Key Prefix:', SERVICE_KEY ? SERVICE_KEY.substring(0, 10) + '...' : 'MISSING');

    // 1. Check profiles table
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, is_admin, display_name')
        .eq('is_admin', true);

    if (error) {
        console.error('Error fetching admin profiles:', error);
    } else {
        if (!profiles || profiles.length === 0) {
            console.log('No admin profiles found.');
        } else {
            console.log(`Found ${profiles.length} admin profiles:`);
            profiles.forEach(p => {
                console.log(`- ${p.email} (ID: ${p.id}, Display: ${p.display_name})`);
            });
        }
    }
}

checkAdmins();
