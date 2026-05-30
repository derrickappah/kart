import { createClient, createServiceRoleClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

/**
 * POST /api/admin/products/update-status
 * Body: { productId, status }
 * Bans/restores a product. Requires server-verified admin session.
 */
export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Server-side admin check (BUG-03)
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const { productId, status } = await request.json();

  if (!productId || !status) {
    return NextResponse.json({ error: 'Missing productId or status' }, { status: 400 });
  }

  const allowedStatuses = ['Active', 'Pending', 'Banned'];
  if (!allowedStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
  }

  const adminSupabase = createServiceRoleClient();
  const { error } = await adminSupabase
    .from('products')
    .update({ status })
    .eq('id', productId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/admin/products/update-status
 * Body: { productId }
 * Permanently deletes a product. Requires server-verified admin session.
 */
export async function DELETE(request) {
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

  const { productId } = await request.json();

  if (!productId) {
    return NextResponse.json({ error: 'Missing productId' }, { status: 400 });
  }

  const adminSupabase = createServiceRoleClient();
  const { error } = await adminSupabase
    .from('products')
    .delete()
    .eq('id', productId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
