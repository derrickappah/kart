const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { formatToInternationalPhone } = require('../utils/phoneUtils');

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

async function standardizeAllProfiles() {
    console.log('🔄 Standardizing profile phone numbers to international format...');

    const env = loadEnv();
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Error: Missing Supabase environment variables in .env.local');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, display_name, phone');

    if (error) {
        console.error('❌ Error fetching profiles:', error.message);
        return;
    }

    console.log(`Found ${profiles.length} total profiles.`);

    let updatedCount = 0;
    for (const profile of profiles) {
        if (!profile.phone) continue;

        const standardized = formatToInternationalPhone(profile.phone);
        if (standardized && standardized !== profile.phone) {
            console.log(`Updating ${profile.email || profile.display_name || profile.id}: "${profile.phone}" -> "${standardized}"`);
            
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ phone: standardized })
                .eq('id', profile.id);

            if (updateError) {
                console.error(`  ❌ Failed to update profile ${profile.id}:`, updateError.message);
            } else {
                updatedCount++;
            }
        }
    }

    console.log(`✅ Phone standardization completed. Updated ${updatedCount} profiles.`);
}

standardizeAllProfiles().catch(console.error);
