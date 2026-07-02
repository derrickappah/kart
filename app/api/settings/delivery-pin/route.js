import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { currentPin, newPin } = body;

    if (!newPin) {
      return NextResponse.json(
        { error: 'New PIN is required' },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(newPin)) {
      return NextResponse.json(
        { error: 'PIN must be exactly 6 digits (0-9)' },
        { status: 400 }
      );
    }

    // Use service role client to read/write profiles delivery_pin_hash
    const adminSupabase = createServiceRoleClient();

    // 1. Fetch current profile to see if a PIN is already configured
    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('delivery_pin_hash')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile for PIN update:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }

    // 2. If a PIN is already configured, we require currentPin verification
    if (profile?.delivery_pin_hash) {
      if (!currentPin) {
        return NextResponse.json(
          { error: 'Current PIN is required to change your delivery PIN' },
          { status: 400 }
        );
      }

      const matches = await bcrypt.compare(currentPin, profile.delivery_pin_hash);
      if (!matches) {
        return NextResponse.json(
          { error: 'Incorrect current PIN' },
          { status: 400 }
        );
      }
    }

    // 3. Hash the new PIN
    const hashedPin = await bcrypt.hash(newPin, 10);

    // 4. Update the profile
    const { error: updateError } = await adminSupabase
      .from('profiles')
      .update({
        delivery_pin_hash: hashedPin,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating delivery PIN hash:', updateError);
      return NextResponse.json(
        { error: 'Failed to save delivery PIN' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: profile?.delivery_pin_hash
        ? 'Delivery PIN updated successfully'
        : 'Delivery PIN configured successfully',
    });
  } catch (error) {
    console.error('Delivery PIN update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update delivery PIN' },
      { status: 500 }
    );
  }
}
