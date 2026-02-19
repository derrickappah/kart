
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.trim();
    }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log('Fetching one subscription...');
    const { data: subs, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .limit(1);

    if (subError) {
        console.error('Error fetching subscription:', subError);
        return;
    }

    if (subs.length === 0) {
        console.log('No subscriptions found.');
        return;
    }

    const sub = subs[0];
    console.log('Subscription record keys:', Object.keys(sub));
    console.log('Subscription record:', sub);

    if (sub.user_id) {
        console.log(`Checking profile for user_id: ${sub.user_id}`);
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', sub.user_id);

        if (profileError) {
            console.error('Error fetching profile:', profileError);
        } else {
            console.log('Profile found:', profiles.length > 0 ? profiles[0] : 'None');
        }
    } else {
        console.log('No user_id in subscription record.');
    }
}

inspect();
