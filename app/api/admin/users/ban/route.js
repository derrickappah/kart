import { createClient, createServiceRoleClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

/**
 * POST /api/admin/users/ban
 * Body: { userId, banned }
 * Bans or unbans a user. Requires server-verified admin session. (BUG-05)
 */
export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Server-side admin check
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const { userId, banned } = await request.json();

  if (!userId || typeof banned !== 'boolean') {
    return NextResponse.json({ error: 'Missing userId or banned value' }, { status: 400 });
  }

  // Prevent banning other admins
  const adminSupabase = createServiceRoleClient();
  const { data: targetProfile } = await adminSupabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single();

  if (targetProfile?.is_admin) {
    return NextResponse.json({ error: 'Cannot ban an admin account' }, { status: 403 });
  }

  const { error } = await adminSupabase
    .from('profiles')
    .update({ banned })
    .eq('id', userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
