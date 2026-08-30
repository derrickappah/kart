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

async function standardizeAllTables() {
    console.log('🔄 Standardizing database phone numbers to international format...');

    const env = loadEnv();
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Error: Missing Supabase environment variables in .env.local');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Profiles
    const { data: profiles, error: profileErr } = await supabase
        .from('profiles')
        .select('id, email, display_name, phone');

    if (profileErr) {
        console.error('❌ Error fetching profiles:', profileErr.message);
    } else {
        console.log(`Checking ${profiles.length} total profiles.`);
        let updatedProfiles = 0;
        for (const profile of profiles) {
            if (!profile.phone) continue;

            const standardized = formatToInternationalPhone(profile.phone);
            if (standardized && standardized !== profile.phone) {
                console.log(`  Updating profile (${profile.email || profile.display_name || profile.id}): "${profile.phone}" -> "${standardized}"`);
                
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({ phone: standardized })
                    .eq('id', profile.id);

                if (updateError) {
                    console.error(`    ❌ Failed to update profile ${profile.id}:`, updateError.message);
                } else {
                    updatedProfiles++;
                }
            }
        }
        console.log(`✅ Profiles check complete. Updated ${updatedProfiles} records.`);
    }

    // 2. Phone Verifications Table
    const { data: verifications, error: verifErr } = await supabase
        .from('phone_verifications')
        .select('id, phone');

    if (verifErr) {
        console.log('ℹ️ phone_verifications query note:', verifErr.message);
    } else if (verifications && verifications.length > 0) {
        let updatedVerifs = 0;
        for (const v of verifications) {
            if (!v.phone) continue;
            const standardized = formatToInternationalPhone(v.phone);
            if (standardized && standardized !== v.phone) {
                await supabase
                    .from('phone_verifications')
                    .update({ phone: standardized })
                    .eq('id', v.id);
                updatedVerifs++;
            }
        }
        console.log(`✅ phone_verifications check complete. Updated ${updatedVerifs} records.`);
    }

    // 3. Platform Settings (WhatsApp support number)
    const { data: settings } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('key', 'whatsapp_support_number');

    if (settings && settings.length > 0) {
        const rawVal = settings[0].value;
        const cleanVal = typeof rawVal === 'string' ? rawVal.replace(/^"|"$/g, '') : String(rawVal);
        const std = formatToInternationalPhone(cleanVal);
        if (std) {
            await supabase
                .from('platform_settings')
                .update({ value: JSON.stringify(std) })
                .eq('key', 'whatsapp_support_number');
            console.log(`✅ platform_settings whatsapp_support_number updated to ${JSON.stringify(std)}.`);
        }
    }

    console.log('🎉 All phone numbers in database standardized to international format!');
}

standardizeAllTables().catch(console.error);
