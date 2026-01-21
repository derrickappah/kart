const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Helper to load .env.local
function loadEnv() {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) {
        console.error('Error: .env.local not found in current directory');
        process.exit(1);
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            const key = match[1];
            let value = match[2] || '';
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
            env[key] = value.trim();
        }
    });
    return env;
}

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing Supabase environment variables in .env.local');
    console.log('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function grantAdmin(email) {
    console.log(`Attempting to grant admin access to: ${email}`);

    const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('id, email, is_admin')
        .eq('email', email)
        .single();

    if (fetchError) {
        console.error('Error finding profile:', fetchError.message);
        console.log('Make sure the user has signed up and the email is correct.');
        return;
    }

    console.log(`Found profile for ${email} (ID: ${profile.id})`);

    if (profile.is_admin) {
        console.log('User is already an admin.');
        return;
    }

    const { data, error } = await supabase
        .from('profiles')
        .update({ is_admin: true })
        .eq('id', profile.id)
        .select();

    if (error) {
        console.error('Error updating profile:', error.message);
        return;
    }

    if (data && data.length > 0) {
        console.log('Successfully granted admin access!');
        console.log('Profile updated:', data[0]);
    } else {
        console.warn('Failed to update profile.');
    }
}

const email = process.argv[2];
if (!email) {
    console.log('Usage: node scripts/grant-admin.js <email>');
    process.exit(1);
}

grantAdmin(email);
