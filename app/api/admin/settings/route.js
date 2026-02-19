import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceRoleClient } from '@/utils/supabase/server';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch all settings
        const { data: settings, error } = await supabase
            .from('platform_settings')
            .select('*')
            .order('category');

        if (error) {
            console.error('[Settings API] Error fetching settings:', error);
            return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
        }

        // Group by category
        const grouped = {};
        (settings || []).forEach(s => {
            if (!grouped[s.category]) grouped[s.category] = [];
            grouped[s.category].push(s);
        });

        return NextResponse.json({ settings: settings || [], grouped });
    } catch (error) {
        console.error('[Settings API] Unexpected error:', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Admin check
        const adminClient = createServiceRoleClient();
        const { data: profile } = await adminClient
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();

        if (!profile?.is_admin) {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const body = await request.json();
        const { updates } = body; // Array of { key, value }

        if (!updates || !Array.isArray(updates) || updates.length === 0) {
            return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
        }

        const results = [];
        const errors = [];

        for (const update of updates) {
            if (!update.key) {
                errors.push({ key: update.key, error: 'Missing key' });
                continue;
            }

            const { data, error } = await adminClient
                .from('platform_settings')
                .update({
                    value: update.value,
                    updated_at: new Date().toISOString(),
                    updated_by: user.id
                })
                .eq('key', update.key)
                .select()
                .single();

            if (error) {
                console.error(`[Settings API] Error updating ${update.key}:`, error);
                errors.push({ key: update.key, error: error.message });
            } else {
                results.push(data);
            }
        }

        if (errors.length > 0 && results.length === 0) {
            return NextResponse.json({ error: 'All updates failed', errors }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            updated: results,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        console.error('[Settings API] Unexpected error:', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}
