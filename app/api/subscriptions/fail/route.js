import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';

export async function POST(request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { subscriptionId } = await request.json();

        if (!subscriptionId) {
            return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 });
        }

        // Verify the subscription belongs to the user and is pending
        const { data: subscription, error: fetchError } = await supabase
            .from('subscriptions')
            .select('id, status')
            .eq('id', subscriptionId)
            .eq('user_id', user.id)
            .single();

        if (fetchError || !subscription) {
            console.error('[Subscription Fail API] Subscription not found or access denied:', fetchError);
            return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
        }

        // Only allow failing if currently pending
        if (subscription.status !== 'Pending' && subscription.status !== 'pending') {
            return NextResponse.json({
                error: `Cannot mark subscription as failed from status: ${subscription.status}`
            }, { status: 400 });
        }

        // Use service role client to bypass RLS for the update
        const adminSupabase = createServiceRoleClient();
        const { error: updateError } = await adminSupabase
            .from('subscriptions')
            .update({
                status: 'Cancelled', // Changed from 'Failed' to satisfy DB check constraint
                updated_at: new Date().toISOString()
            })
            .eq('id', subscriptionId);

        if (updateError) {
            console.error('[Subscription Fail API] Update error:', updateError);
            return NextResponse.json({ error: 'Failed to update subscription status' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Subscription marked as cancelled' });
    } catch (error) {
        console.error('[Subscription Fail API] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
