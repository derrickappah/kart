import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceRoleClient } from '@/utils/supabase/server';

export async function GET() {
    try {
        const supabase = await createClient();

        const { data: plans, error } = await supabase
            .from('subscription_plans')
            .select('*')
            .order('price', { ascending: true });

        if (error) {
            console.error('[Plans API] Error fetching plans:', error);
            return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
        }

        return NextResponse.json({ plans: plans || [] });
    } catch (error) {
        console.error('[Plans API] Unexpected error:', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}

export async function POST(request) {
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
        const { name, price, duration_months, features } = body;

        if (!name || price === undefined || !duration_months) {
            return NextResponse.json({ error: 'Missing required fields: name, price, duration_months' }, { status: 400 });
        }

        if (isNaN(parseFloat(price)) || parseFloat(price) < 0) {
            return NextResponse.json({ error: 'Invalid price' }, { status: 400 });
        }

        if (isNaN(parseInt(duration_months)) || parseInt(duration_months) < 1) {
            return NextResponse.json({ error: 'Invalid duration' }, { status: 400 });
        }

        const { data: plan, error } = await adminClient
            .from('subscription_plans')
            .insert({
                name: name.trim(),
                price: parseFloat(price),
                duration_months: parseInt(duration_months),
                features: features || []
            })
            .select()
            .single();

        if (error) {
            console.error('[Plans API] Error creating plan:', error);
            return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 });
        }

        return NextResponse.json({ success: true, plan });
    } catch (error) {
        console.error('[Plans API] Unexpected error:', error);
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
        const { id, name, price, duration_months, features } = body;

        if (!id) {
            return NextResponse.json({ error: 'Missing plan ID' }, { status: 400 });
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name.trim();
        if (price !== undefined) updateData.price = parseFloat(price);
        if (duration_months !== undefined) updateData.duration_months = parseInt(duration_months);
        if (features !== undefined) updateData.features = features;

        const { data: plan, error } = await adminClient
            .from('subscription_plans')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('[Plans API] Error updating plan:', error);
            return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 });
        }

        return NextResponse.json({ success: true, plan });
    } catch (error) {
        console.error('[Plans API] Unexpected error:', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const adminClient = createServiceRoleClient();
        const { data: profile } = await adminClient
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();

        if (!profile?.is_admin) {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Missing plan ID' }, { status: 400 });
        }

        // Check if any active subscriptions use this plan
        const { data: activeSubs } = await adminClient
            .from('subscriptions')
            .select('id')
            .eq('plan_id', id)
            .eq('status', 'Active')
            .limit(1);

        if (activeSubs && activeSubs.length > 0) {
            return NextResponse.json({
                error: 'Cannot delete plan with active subscriptions. Cancel those subscriptions first.'
            }, { status: 409 });
        }

        const { error } = await adminClient
            .from('subscription_plans')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('[Plans API] Error deleting plan:', error);
            return NextResponse.json({ error: 'Failed to delete plan' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Plans API] Unexpected error:', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}
