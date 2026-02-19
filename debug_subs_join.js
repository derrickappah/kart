
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
    console.error('Missing Supabase URL or Key in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSubscriptionsWithJoin() {
    console.log('Checking subscriptions with joins...');
    // query copied from page.js
    const { data, error } = await supabase
        .from('subscriptions')
        .select('*, plan:subscription_plans(*), user:profiles!user_id(email, display_name)')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching subscriptions with join:', error);
    } else {
        console.log(`Found ${data.length} subscriptions with joins.`);
        if (data.length > 0) {
            console.log('First subscription with join:', JSON.stringify(data[0], null, 2));
        } else {
            console.log('Query returned 0 records (likely join issue).');

            // Let's check a raw subscription to see the user_id
            const { data: rawData } = await supabase.from('subscriptions').select('user_id').limit(1);
            if (rawData && rawData.length > 0) {
                console.log('Sample user_id from subscription:', rawData[0].user_id);
                // Check if this profile exists
                const { data: profile } = await supabase.from('profiles').select('*').eq('id', rawData[0].user_id);
                console.log('Does this profile exist?', profile && profile.length > 0 ? 'Yes' : 'No');
            }
        }
    }
}

checkSubscriptionsWithJoin();
