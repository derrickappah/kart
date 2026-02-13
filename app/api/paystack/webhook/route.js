import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';
import { verifyTransaction } from '@/lib/paystack';
import crypto from 'crypto';

// Disable body parsing, we need raw body for signature verification
export const runtime = 'nodejs';

function verifyPaystackSignature(bodyText, signature, secret) {
    const hash = crypto
        .createHmac('sha512', secret)
        .update(bodyText)
        .digest('hex');
    return hash === signature;
}

export async function POST(request) {
    try {
        console.log('[Webhook] Paystack webhook received');
        const adminSupabase = createServiceRoleClient();
        const rawBody = await request.text();
        const payload = JSON.parse(rawBody);
        const signature = request.headers.get('x-paystack-signature');
        const secret = process.env.PAYSTACK_SECRET_KEY;

        if (!signature) {
            console.error('[Webhook] No signature found in headers');
            return NextResponse.json({ error: 'No signature' }, { status: 401 });
        }

        if (!secret) {
            console.error('[Webhook] PAYSTACK_SECRET_KEY is not set. Key prefix:', process.env.PAYSTACK_SECRET_KEY?.substring(0, 5) + '...');
            return NextResponse.json({ error: 'Paystack secret key not configured' }, { status: 500 });
        }

        const hash = crypto
            .createHmac('sha512', secret)
            .update(rawBody)
            .digest('hex');

        if (hash !== signature) {
            console.error('[Webhook] Signature verification failed');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        console.log('[Webhook] Event received:', {
            event: payload.event,
            reference: payload.data?.reference,
            has_signature: !!signature,
        });

        const event = payload.event;
        const data = payload.data;

        // Handle payment success
        if (event === 'charge.success') {
            const reference = data.reference;
            console.log('[Webhook] Processing charge.success for reference:', reference);

            // Verify transaction with Paystack
            let verification;
            try {
                verification = await verifyTransaction(reference);
                console.log('[Webhook] Transaction verification result:', {
                    reference: reference,
                    status: verification.data?.status,
                    amount: verification.data?.amount,
                    currency: verification.data?.currency,
                    metadata_raw: verification.data?.metadata,
                });
            } catch (verifyError) {
                console.error('[Webhook] Transaction verification failed:', verifyError);
                return NextResponse.json({ error: 'Transaction verification failed' }, { status: 400 });
            }

            if (verification.data.status !== 'success') {
                console.error('[Webhook] Transaction not successful:', verification.data.status);
                return NextResponse.json({ error: 'Transaction not successful' }, { status: 400 });
            }

            // 1. Check if this is a wallet deposit
            let metadata = verification.data.metadata;

            // Paystack sometimes returns metadata as a JSON string
            if (typeof metadata === 'string') {
                try {
                    metadata = JSON.parse(metadata);
                } catch (e) {
                    console.error('[Webhook] Failed to parse metadata string:', metadata);
                    metadata = {};
                }
            }

            metadata = metadata || {};
            let type = metadata.type;

            // Fallback: Check custom_fields for type
            if (!type && metadata.custom_fields) {
                console.log('[Webhook] Checking custom_fields for type...');
                const typeField = metadata.custom_fields.find(f => f.variable_name === 'type');
                if (typeField) {
                    type = typeField.value === 'Wallet Deposit' ? 'wallet_deposit' : typeField.value;
                    console.log(`[Webhook] Type found in custom_fields: ${type}`);
                }
            }

            // Critical Fallback: Check reference prefix if metadata is missing
            if (!type && reference && reference.startsWith('wallet_dep_')) {
                console.log('[Webhook] Metadata type missing, but reference indicates wallet_deposit:', reference);
                type = 'wallet_deposit';
            }

            console.log('[Webhook] Resolved metadata type:', type);

            if (type === 'wallet_deposit') {
                // Determine user_id from metadata or reference
                let userId = metadata.user_id || verification.data.metadata?.user_id;

                // Critical Fallback: Extract from reference wdp_FULL-USER-ID_TIMESTAMP
                if (!userId && reference && reference.startsWith('wdp_')) {
                    console.log('[Webhook] Metadata user_id missing, extracting from reference...');
                    const parts = reference.split('_');
                    if (parts.length >= 2) {
                        userId = parts[1];
                        console.log(`[Webhook] User ID recovered from reference: ${userId}`);
                    }
                }

                // Support legacy prefix just in case (though it only has 8 chars)
                if (!userId && reference && reference.startsWith('wallet_dep_')) {
                    console.log('[Webhook] Metadata user_id missing and reference is legacy (truncated). Cannot recover full ID.');
                }

                // Fallback: Check custom_fields for user_id
                if (!userId && metadata.custom_fields) {
                    console.log('[Webhook] Checking custom_fields for user_id...');
                    const idField = metadata.custom_fields.find(f => f.variable_name === 'user_id');
                    if (idField) {
                        userId = idField.value;
                        console.log(`[Webhook] User ID found in custom_fields: ${userId}`);
                    }
                }
                const amount = verification.data.amount / 100; // Paystack amount is in kobo/pesewas

                console.log('[Webhook] Processing wallet deposit:', { userId, amount, reference });

                if (!userId) {
                    console.error('[Webhook] Missing user_id in wallet_deposit metadata', { metadata });
                    return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
                }

                // Get or create wallet
                let { data: wallet, error: walletError } = await adminSupabase
                    .from('wallets')
                    .select('*')
                    .eq('user_id', userId)
                    .single();

                const currentBalance = wallet ? (parseFloat(wallet.balance) || 0) : 0;
                let finalBalance = currentBalance;

                if (walletError && walletError.code === 'PGRST116') {
                    console.log('[Webhook] Wallet not found, creating new one for user:', userId);
                    finalBalance = amount;
                    // Create wallet if it doesn't exist
                    const { data: newWallet, error: createError } = await adminSupabase
                        .from('wallets')
                        .insert({
                            user_id: userId,
                            balance: finalBalance,
                            currency: 'GHS',
                        })
                        .select()
                        .single();

                    if (createError) {
                        console.error('[Webhook] Error creating wallet:', createError);
                        throw createError;
                    }
                    wallet = newWallet;
                    console.log('[Webhook] New wallet created successfully:', wallet.id);
                } else if (wallet) {
                    finalBalance = currentBalance + amount;
                    console.log('[Webhook] Updating existing wallet balance:', {
                        wallet_id: wallet.id,
                        current: currentBalance,
                        adding: amount,
                        new: finalBalance
                    });

                    // Update balance
                    const { error: updateError } = await adminSupabase
                        .from('wallets')
                        .update({
                            balance: finalBalance,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', wallet.id);

                    if (updateError) {
                        console.error('[Webhook] Error updating wallet balance:', updateError);
                        throw updateError;
                    }
                    console.log('[Webhook] Wallet balance updated successfully');
                } else if (walletError) {
                    console.error('[Webhook] Error fetching wallet:', walletError);
                    throw walletError;
                }

                // Record transaction
                console.log('[Webhook] Recording wallet transaction for reference:', reference);
                const transactionData = {
                    wallet_id: wallet.id,
                    amount: amount,
                    transaction_type: 'Credit',
                    status: 'Completed',
                    balance_before: currentBalance,
                    balance_after: finalBalance,
                    admin_notes: `Wallet Deposit via Paystack. Ref: ${reference}`,
                };

                // Add reference and description if they were added via SQL
                // We do this dynamically to avoid errors if SQL hasn't been run yet
                // But since we want them, we'll include them and just log if it fails
                const { error: transError } = await adminSupabase.from('wallet_transactions').insert({
                    ...transactionData,
                    reference: reference,
                    description: 'Wallet Deposit',
                });

                if (transError) {
                    console.error('[Webhook] Error recording transaction (possibly missing columns):', transError);
                    // Fallback try without reference/description if it failed
                    if (transError.code === '42703') { // Column does not exist
                        console.log('[Webhook] Retrying transaction record with fallback columns...');
                        await adminSupabase.from('wallet_transactions').insert(transactionData);
                    }
                } else {
                    console.log('[Webhook] Wallet transaction recorded successfully');
                }

                // Create notification
                await adminSupabase.from('notifications').insert({
                    user_id: userId,
                    type: 'PaymentReceived',
                    title: 'Wallet Top-up Successful',
                    message: `GHS ${amount.toFixed(2)} has been added to your wallet.`,
                });

                return NextResponse.json({ message: 'Wallet deposit processed successfully' }, { status: 200 });
            }

            // 2. Check if this is a subscription payment
            console.log('[Webhook] Looking for subscription with payment_reference:', reference);
            let { data: subscription, error: subError } = await adminSupabase
                .from('subscriptions')
                .select('*, plan:subscription_plans(*)')
                .eq('payment_reference', reference)
                .single();

            // If not found, try case-insensitive match
            if (subError && subError.code === 'PGRST116') {
                console.log('[Webhook] Exact match not found, trying case-insensitive search...');
                const { data: allSubs } = await adminSupabase
                    .from('subscriptions')
                    .select('*, plan:subscription_plans(*)')
                    .ilike('payment_reference', reference);

                if (allSubs && allSubs.length > 0) {
                    console.log('[Webhook] Found subscription with case-insensitive match');
                    subscription = allSubs[0];
                    subError = null;
                    // Update the reference to match exactly
                    await adminSupabase
                        .from('subscriptions')
                        .update({ payment_reference: reference })
                        .eq('id', subscription.id);
                }
            }

            // If still not found, try to find by metadata
            if (subError && (metadata.subscription_id)) {
                console.log('[Webhook] Trying to find subscription by metadata subscription_id:', metadata.subscription_id);
                const { data: metaSub, error: metaError } = await adminSupabase
                    .from('subscriptions')
                    .select('*, plan:subscription_plans(*)')
                    .eq('id', metadata.subscription_id)
                    .single();

                if (!metaError && metaSub) {
                    console.log('[Webhook] Found subscription by metadata, updating payment_reference');
                    subscription = metaSub;
                    subError = null;
                    // Update the payment reference
                    await adminSupabase
                        .from('subscriptions')
                        .update({ payment_reference: reference })
                        .eq('id', subscription.id);
                }
            }

            if (!subError && subscription) {
                console.log('[Webhook] Found subscription, updating status to Active');

                // Update subscription
                await adminSupabase
                    .from('subscriptions')
                    .update({
                        status: 'Active',
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', subscription.id);

                // Create notification
                await adminSupabase.from('notifications').insert({
                    user_id: subscription.user_id,
                    type: 'SubscriptionActivated',
                    title: 'Subscription Activated',
                    message: `Your ${subscription.plan?.name || 'subscription'} has been activated successfully!`,
                });

                return NextResponse.json({ message: 'Subscription payment processed successfully' }, { status: 200 });
            }

            // 3. Find order by payment reference
            console.log('[Webhook] Looking for order with payment_reference:', reference);
            let { data: order, error: orderError } = await adminSupabase
                .from('orders')
                .select('*, product:products(*)')
                .eq('payment_reference', reference)
                .single();

            if (orderError && orderError.code === 'PGRST116' && metadata.order_id) {
                console.log('[Webhook] Trying to find order by metadata order_id:', metadata.order_id);
                const { data: metaOrder, error: metaError } = await adminSupabase
                    .from('orders')
                    .select('*, product:products(*)')
                    .eq('id', metadata.order_id)
                    .single();

                if (!metaError && metaOrder) {
                    order = metaOrder;
                    orderError = null;
                    // Update references
                    await adminSupabase
                        .from('orders')
                        .update({ payment_reference: reference })
                        .eq('id', order.id);
                }
            }

            if (orderError || !order) {
                console.error('[Webhook] Resource not found for reference:', reference);
                return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
            }

            // Only process if order is still pending
            if (order.status !== 'Pending') {
                return NextResponse.json({ message: 'Order already processed' }, { status: 200 });
            }

            // Update order status to Paid
            await adminSupabase
                .from('orders')
                .update({
                    status: 'Paid',
                    paystack_transaction_id: verification.data.id.toString(),
                    escrow_status: 'Held',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', order.id);

            // Update product stock
            if (order.product && order.product.stock_quantity !== null) {
                const newStock = Math.max(0, order.product.stock_quantity - order.quantity);
                const productStatus = newStock === 0 ? 'Sold' : order.product.status;

                await adminSupabase.from('products').update({ stock_quantity: newStock, status: productStatus }).eq('id', order.product_id);
            } else if (order.product && order.quantity === 1) {
                await adminSupabase.from('products').update({ status: 'Sold' }).eq('id', order.product_id);
            }

            // Update seller's pending balance
            const { data: sellerWallet } = await adminSupabase
                .from('wallets')
                .select('*')
                .eq('user_id', order.seller_id)
                .single();

            if (!sellerWallet) {
                await adminSupabase.from('wallets').insert({
                    user_id: order.seller_id,
                    balance: 0,
                    pending_balance: order.seller_payout_amount,
                    currency: 'GHS',
                });
            } else {
                await adminSupabase
                    .from('wallets')
                    .update({
                        pending_balance: (parseFloat(sellerWallet.pending_balance) || 0) + parseFloat(order.seller_payout_amount),
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', sellerWallet.id);
            }

            // Notifications and history
            await adminSupabase.from('notifications').insert([
                {
                    user_id: order.buyer_id,
                    type: 'PaymentReceived',
                    title: 'Payment Successful',
                    message: `Your payment for order #${order.id.slice(0, 8)} has been received.`,
                    related_order_id: order.id,
                },
                {
                    user_id: order.seller_id,
                    type: 'OrderPlaced',
                    title: 'New Order Received',
                    message: `You have received a new order for ${order.quantity}x ${order.product?.title || 'product'}.`,
                    related_order_id: order.id,
                },
            ]);

            await adminSupabase.from('order_status_history').insert({
                order_id: order.id,
                old_status: 'Pending',
                new_status: 'Paid',
                notes: 'Payment confirmed via Paystack webhook',
            });

            return NextResponse.json({ message: 'Order payment processed successfully' }, { status: 200 });
        }

        console.log('[Webhook] Event not handled:', event);
        return NextResponse.json({ message: 'Event not handled' }, { status: 200 });
    } catch (error) {
        console.error('[Webhook] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
