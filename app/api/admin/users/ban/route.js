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

  const body = await request.json();
  const rawIds = body.userIds || (body.userId ? [body.userId] : []);
  const ids = Array.isArray(rawIds) ? rawIds.filter(Boolean) : [];
  const banned = body.banned;

  if (ids.length === 0 || typeof banned !== 'boolean') {
    return NextResponse.json({ error: 'Missing userId(s) or banned value' }, { status: 400 });
  }

  const adminSupabase = createServiceRoleClient();

  // Prevent banning any admin accounts
  if (banned) {
    const { data: adminProfiles } = await adminSupabase
      .from('profiles')
      .select('id')
      .in('id', ids)
      .eq('is_admin', true);

    if (adminProfiles && adminProfiles.length > 0) {
      return NextResponse.json({ error: 'Cannot ban admin accounts. Remove admin role first.' }, { status: 403 });
    }
  }

  const { error } = await adminSupabase
    .from('profiles')
    .update({ banned })
    .in('id', ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update ban status in Supabase Auth (auth.users)
  await Promise.allSettled(
    ids.map((id) =>
      adminSupabase.auth.admin.updateUserById(id, {
        ban_duration: banned ? '876000h' : 'none'
      })
    )
  );

  return NextResponse.json({ success: true, count: ids.length });
}
