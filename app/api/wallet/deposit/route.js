import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { initializePayment } from '@/lib/paystack';

export async function POST(request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { amount, email } = body;

        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }

        // Generate unique reference for wallet deposit - include full user.id for recovery if metadata is lost
        const reference = `wdp_${user.id}_${Date.now()}`;

        // Initialize payment with Paystack
        const paymentData = await initializePayment({
            amount: parseFloat(amount),
            email: email || user.email,
            reference,
            callback_url: `${process.env.NEXT_PUBLIC_APP_URL || (request.headers.get('origin') || 'http://localhost:3000')}/dashboard/wallet?deposit_success=true&ref=${reference}`,
            metadata: {
                type: 'wallet_deposit',
                user_id: user.id,
                custom_fields: [
                    { display_name: 'Transaction Type', variable_name: 'type', value: 'Wallet Deposit' },
                    { display_name: 'User ID', variable_name: 'user_id', value: user.id },
                ],
            },
        });

        return NextResponse.json({
            success: true,
            authorization_url: paymentData.data.authorization_url,
            reference: paymentData.data.reference,
        });
    } catch (error) {
        console.error('Wallet deposit initiation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to initiate deposit' },
            { status: 500 }
        );
    }
}
