import { createClient, createServiceRoleClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

/**
 * POST /api/admin/subscriptions/update-status
 * Body: { subscriptionId, status }
 * Activates or cancels a subscription. Requires server-verified admin. (BUG-04)
 */
export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const { subscriptionId, status } = await request.json();

  if (!subscriptionId || !status) {
    return NextResponse.json({ error: 'Missing subscriptionId or status' }, { status: 400 });
  }

  const allowedStatuses = ['Active', 'Cancelled', 'Expired', 'Pending'];
  if (!allowedStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
  }

  const adminSupabase = createServiceRoleClient();
  const { error } = await adminSupabase
    .from('subscriptions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', subscriptionId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
