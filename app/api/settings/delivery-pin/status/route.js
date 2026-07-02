import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';

export async function GET(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSupabase = createServiceRoleClient();
    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('delivery_pin_hash')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile for PIN status:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      hasPin: !!profile?.delivery_pin_hash
    });
  } catch (error) {
    console.error('Delivery PIN status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch delivery PIN status' },
      { status: 500 }
    );
  }
}
