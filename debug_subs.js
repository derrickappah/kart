
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

async function checkSubscriptions() {
    console.log('Checking subscriptions table...');
    const { data, error } = await supabase
        .from('subscriptions')
        .select('*');

    if (error) {
        console.error('Error fetching subscriptions:', error);
    } else {
        console.log(`Found ${data.length} subscriptions.`);
        if (data.length > 0) {
            console.log('First subscription:', data[0]);
        } else {
            console.log('Table is empty.');
        }
    }
}

checkSubscriptions();
