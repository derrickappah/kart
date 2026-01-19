import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      bank_account_number, 
      bank_code, 
      bank_account_name,
      momo_number,
      momo_network,
      momo_name
    } = body;

    // Get current profile to preserve other data
    const { data: currentProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('bank_account_details, momo_details')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      console.error('Error fetching profile:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    // Prepare payment details objects - merge with existing data
    const existingBankDetails = currentProfile?.bank_account_details || {};
    const bankAccountDetails = { ...existingBankDetails };
    
    // Update bank fields if provided (empty strings become null)
    if (bank_account_number !== undefined) {
      bankAccountDetails.account_number = (typeof bank_account_number === 'string' && bank_account_number.trim()) || null;
    }
    if (bank_code !== undefined) {
      bankAccountDetails.bank_code = (typeof bank_code === 'string' && bank_code.trim()) || null;
    }
    if (bank_account_name !== undefined) {
      bankAccountDetails.account_name = (typeof bank_account_name === 'string' && bank_account_name.trim()) || null;
    }

    const existingMomoDetails = currentProfile?.momo_details || {};
    const momoDetails = { ...existingMomoDetails };
    
    // Update momo fields if provided (empty strings become null)
    if (momo_number !== undefined) {
      momoDetails.number = (typeof momo_number === 'string' && momo_number.trim()) || null;
    }
    if (momo_network !== undefined) {
      momoDetails.network = (typeof momo_network === 'string' && momo_network.trim()) || null;
    }
    if (momo_name !== undefined) {
      momoDetails.name = (typeof momo_name === 'string' && momo_name.trim()) || null;
    }

    // Build update payload - always include both if we have existing data or new data
    const updatePayload = {
      bank_account_details: bankAccountDetails,
      momo_details: momoDetails,
    };

    // Update profile with payment details
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', user.id)
      .select()
      .single();

    if (profileError) {
      console.error('Error updating payment details:', profileError);
      return NextResponse.json(
        { error: `Failed to update payment details: ${profileError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: profile,
    });
  } catch (error) {
    console.error('Payment details update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update payment details' },
      { status: 500 }
    );
  }
}
