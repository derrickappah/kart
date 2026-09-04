import { createClient, createServiceRoleClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { deleteCache } from '@/lib/cache';

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

  const body = await request.json();
  const rawIds = body.productIds || (body.productId ? [body.productId] : []);
  const ids = Array.isArray(rawIds) ? rawIds.filter(Boolean) : [];
  const status = body.status;

  if (ids.length === 0 || !status) {
    return NextResponse.json({ error: 'Missing product ID(s) or status' }, { status: 400 });
  }

  const allowedStatuses = ['Active', 'Pending', 'Banned'];
  if (!allowedStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
  }

  const adminSupabase = createServiceRoleClient();
  const { error } = await adminSupabase
    .from('products')
    .update({ status })
    .in('id', ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Invalidate product details and public listings cache
  const cacheDeletions = ids.map(id => deleteCache(`product:${id}:details`));
  await Promise.all([
    ...cacheDeletions,
    deleteCache('home:products:latest'),
    deleteCache('home:ads:active'),
    deleteCache('marketplace:feed:*'),
  ]);

  return NextResponse.json({ success: true, count: ids.length });
}

/**
 * DELETE /api/admin/products/update-status
 * Body: { productId } or { productIds }
 * Permanently deletes a product or batch of products. Requires server-verified admin session.
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

  const body = await request.json();
  const rawIds = body.productIds || (body.productId ? [body.productId] : []);
  const ids = Array.isArray(rawIds) ? rawIds.filter(Boolean) : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: 'Missing product ID(s)' }, { status: 400 });
  }

  const adminSupabase = createServiceRoleClient();
  const { error } = await adminSupabase
    .from('products')
    .delete()
    .in('id', ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Invalidate product details and public listings cache
  const cacheDeletions = ids.map(id => deleteCache(`product:${id}:details`));
  await Promise.all([
    ...cacheDeletions,
    deleteCache('home:products:latest'),
    deleteCache('home:ads:active'),
    deleteCache('marketplace:feed:*'),
  ]);

  return NextResponse.json({ success: true, count: ids.length });
}
