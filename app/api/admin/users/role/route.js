import { createClient, createServiceRoleClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

/**
 * POST /api/admin/users/role
 * Body: { userId, isAdmin }
 * Promotes or revokes admin role for a user. Requires server-verified admin session.
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

  const { userId, isAdmin } = await request.json();

  if (!userId || typeof isAdmin !== 'boolean') {
    return NextResponse.json({ error: 'Missing userId or isAdmin boolean' }, { status: 400 });
  }

  // Prevent admin from revoking their own admin access
  if (userId === user.id && !isAdmin) {
    return NextResponse.json(
      { error: 'You cannot revoke your own administrative privileges.' },
      { status: 400 }
    );
  }

  const adminSupabase = createServiceRoleClient();
  const { error } = await adminSupabase
    .from('profiles')
    .update({ is_admin: isAdmin })
    .eq('id', userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, userId, isAdmin });
}