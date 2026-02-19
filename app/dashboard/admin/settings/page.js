import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import SettingsClient from './SettingsClient';

export default async function AdminSettingsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Fetch platform settings
    const { data: settings, error: settingsError } = await supabase
        .from('platform_settings')
        .select('*')
        .order('category');

    if (settingsError) {
        console.error('Error fetching platform settings:', settingsError);
    }

    // Fetch subscription plans
    const { data: plans, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price', { ascending: true });

    if (plansError) {
        console.error('Error fetching subscription plans:', plansError);
    }

    // Group settings by category
    const grouped = {};
    (settings || []).forEach(s => {
        if (!grouped[s.category]) grouped[s.category] = [];
        grouped[s.category].push(s);
    });

    return (
        <div className="space-y-8 pb-12">
            <SettingsClient
                initialSettings={settings || []}
                groupedSettings={grouped}
                initialPlans={plans || []}
            />
        </div>
    );
}
