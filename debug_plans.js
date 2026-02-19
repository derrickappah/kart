
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

async function checkPlans() {
    console.log('Checking plans join...');
    const { data, error } = await supabase
        .from('subscriptions')
        .select('*, plan:subscription_plans(*)')
        .limit(1);

    if (error) {
        console.error('Error fetching plans join:', error);
    } else {
        console.log('Plans join successful.');
        console.log('Record:', JSON.stringify(data[0], null, 2));
    }
}

checkPlans();
