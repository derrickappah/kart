-- Migration: Security Hardening & Concurrency / Anti-Race Condition RPCs
-- Date: 2026-08-22

-- 1. Atomic Wallet Payment Procedure
-- Prevents double-spending, inventory races, and negative balances
CREATE OR REPLACE FUNCTION public.execute_wallet_payment(
    p_buyer_id UUID,
    p_product_id UUID,
    p_quantity INT,
    p_fee_percent NUMERIC,
    p_fee_fixed NUMERIC,
    p_marketplace_fee NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_product RECORD;
    v_buyer_wallet RECORD;
    v_seller_wallet RECORD;
    v_unit_price NUMERIC;
    v_subtotal NUMERIC;
    v_total_amount NUMERIC;
    v_seller_payout NUMERIC;
    v_platform_fee_total NUMERIC;
    v_order_id UUID;
    v_buyer_balance_before NUMERIC;
    v_buyer_balance_after NUMERIC;
    v_new_stock INT;
    v_product_status TEXT;
BEGIN
    -- 1. Lock and validate Product
    SELECT * INTO v_product
    FROM public.products
    WHERE id = p_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found';
    END IF;

    IF v_product.status NOT IN ('Active', 'active') THEN
        RAISE EXCEPTION 'Product is no longer available';
    END IF;

    IF v_product.seller_id = p_buyer_id THEN
        RAISE EXCEPTION 'You cannot buy your own product';
    END IF;

    IF v_product.stock_quantity IS NOT NULL AND v_product.stock_quantity < p_quantity THEN
        RAISE EXCEPTION 'Insufficient stock';
    END IF;

    -- 2. Calculations
    v_unit_price := v_product.price;
    v_subtotal := v_unit_price * p_quantity;
    v_total_amount := v_subtotal + p_marketplace_fee;
    v_seller_payout := v_subtotal - ((v_subtotal * p_fee_percent) / 100) - p_fee_fixed;
    v_platform_fee_total := p_marketplace_fee + ((v_subtotal * p_fee_percent) / 100) + p_fee_fixed;

    IF v_seller_payout < 0 THEN
        v_seller_payout := 0;
    END IF;

    -- 3. Lock and validate Buyer Wallet
    SELECT * INTO v_buyer_wallet
    FROM public.wallets
    WHERE user_id = p_buyer_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Buyer wallet not found';
    END IF;

    v_buyer_balance_before := COALESCE(v_buyer_wallet.balance, 0);

    IF v_buyer_balance_before < v_total_amount THEN
        RAISE EXCEPTION 'Insufficient wallet balance. Balance: %, Required: %', v_buyer_balance_before, v_total_amount;
    END IF;

    v_buyer_balance_after := v_buyer_balance_before - v_total_amount;

    -- 4. Deduct Buyer Wallet
    UPDATE public.wallets
    SET balance = v_buyer_balance_after,
        updated_at = NOW()
    WHERE id = v_buyer_wallet.id;

    -- 5. Lock or Create Seller Wallet and update pending_balance
    SELECT * INTO v_seller_wallet
    FROM public.wallets
    WHERE user_id = v_product.seller_id
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO public.wallets (user_id, balance, pending_balance, currency)
        VALUES (v_product.seller_id, 0, v_seller_payout, 'GHS')
        RETURNING * INTO v_seller_wallet;
    ELSE
        UPDATE public.wallets
        SET pending_balance = COALESCE(pending_balance, 0) + v_seller_payout,
            updated_at = NOW()
        WHERE id = v_seller_wallet.id;
    END IF;

    -- 6. Update Product Stock / Status
    IF v_product.stock_quantity IS NOT NULL THEN
        v_new_stock := GREATEST(0, v_product.stock_quantity - p_quantity);
        v_product_status := CASE WHEN v_new_stock = 0 THEN 'Sold' ELSE v_product.status END;
        UPDATE public.products
        SET stock_quantity = v_new_stock,
            status = v_product_status,
            updated_at = NOW()
        WHERE id = p_product_id;
    ELSE
        UPDATE public.products
        SET status = 'Sold',
            updated_at = NOW()
        WHERE id = p_product_id;
    END IF;

    -- 7. Insert Order
    INSERT INTO public.orders (
        buyer_id,
        seller_id,
        product_id,
        quantity,
        unit_price,
        total_amount,
        platform_fee_percentage,
        platform_fee_fixed,
        platform_fee_total,
        seller_payout_amount,
        status,
        escrow_status,
        currency,
        payment_method
    ) VALUES (
        p_buyer_id,
        v_product.seller_id,
        p_product_id,
        p_quantity,
        v_unit_price,
        v_total_amount,
        p_fee_percent,
        p_fee_fixed + p_marketplace_fee,
        v_platform_fee_total,
        v_seller_payout,
        'Paid',
        'Held',
        'GHS',
        'Wallet'
    )
    RETURNING id INTO v_order_id;

    -- 8. Record Ledger Transactions
    INSERT INTO public.wallet_transactions (
        wallet_id,
        order_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        status,
        reference,
        description,
        admin_notes
    ) VALUES (
        v_buyer_wallet.id,
        v_order_id,
        'Debit',
        v_total_amount,
        v_buyer_balance_before,
        v_buyer_balance_after,
        'Completed',
        v_order_id::text,
        'Product Purchase',
        'Purchase of ' || v_product.title
    );

    -- 9. Insert Order Status History
    INSERT INTO public.order_status_history (
        order_id,
        old_status,
        new_status,
        changed_by,
        notes
    ) VALUES (
        v_order_id,
        NULL,
        'Paid',
        p_buyer_id,
        'Order paid using KART Wallet (Atomic)'
    );

    -- 10. Create Notifications
    INSERT INTO public.notifications (user_id, type, title, message, related_order_id)
    VALUES
    (p_buyer_id, 'PaymentReceived', 'Purchase Successful', 'Your payment for "' || v_product.title || '" was successful. Funds held in escrow.', v_order_id),
    (v_product.seller_id, 'OrderPlaced', 'Item Sold!', 'Your item "' || v_product.title || '" has been purchased. Please prepare for handover.', v_order_id);

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'total_amount', v_total_amount,
        'new_balance', v_buyer_balance_after,
        'product_title', v_product.title,
        'seller_id', v_product.seller_id
    );
END;
$$;


-- 2. Atomic Wallet Withdrawal Procedure
-- Locks wallet row, validates balance, decrements balance, increments pending_balance, and inserts request
CREATE OR REPLACE FUNCTION public.execute_wallet_withdrawal(
    p_user_id UUID,
    p_amount NUMERIC,
    p_method TEXT,
    p_payout_details JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_wallet RECORD;
    v_balance_before NUMERIC;
    v_balance_after NUMERIC;
    v_pending_before NUMERIC;
    v_pending_after NUMERIC;
    v_request_id UUID;
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Withdrawal amount must be greater than zero';
    END IF;

    -- Lock wallet
    SELECT * INTO v_wallet
    FROM public.wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Wallet not found';
    END IF;

    v_balance_before := COALESCE(v_wallet.balance, 0);
    v_pending_before := COALESCE(v_wallet.pending_balance, 0);

    IF v_balance_before < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance. Available: %, Requested: %', v_balance_before, p_amount;
    END IF;

    v_balance_after := v_balance_before - p_amount;
    v_pending_after := v_pending_before + p_amount;

    -- Update wallet
    UPDATE public.wallets
    SET balance = v_balance_after,
        pending_balance = v_pending_after,
        updated_at = NOW()
    WHERE id = v_wallet.id;

    -- Insert withdrawal request
    INSERT INTO public.withdrawal_requests (
        wallet_id,
        user_id,
        amount,
        currency,
        status,
        payout_method,
        payout_details
    ) VALUES (
        v_wallet.id,
        p_user_id,
        p_amount,
        'GHS',
        'Pending',
        COALESCE(p_method, 'bank'),
        COALESCE(p_payout_details, '{}'::jsonb)
    )
    RETURNING id INTO v_request_id;

    -- Record transaction
    INSERT INTO public.wallet_transactions (
        wallet_id,
        amount,
        transaction_type,
        status,
        balance_before,
        balance_after,
        reference,
        description,
        admin_notes
    ) VALUES (
        v_wallet.id,
        p_amount,
        'Withdrawal',
        'Pending',
        v_balance_before,
        v_balance_after,
        v_request_id::text,
        'Withdrawal Request',
        'Withdrawal request #' || v_request_id::text || '. Method: ' || COALESCE(p_method, 'bank')
    );

    RETURN jsonb_build_object(
        'success', true,
        'withdrawal_request_id', v_request_id,
        'new_balance', v_balance_after,
        'pending_balance', v_pending_after
    );
END;
$$;


-- 3. Atomic Escrow Release Procedure
-- Row locks order and seller wallet, transitions status, and moves pending_balance to balance
CREATE OR REPLACE FUNCTION public.execute_escrow_release(
    p_order_id UUID,
    p_buyer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_seller_wallet RECORD;
    v_payout_amount NUMERIC;
    v_seller_balance_before NUMERIC;
    v_seller_balance_after NUMERIC;
    v_seller_pending_before NUMERIC;
    v_seller_pending_after NUMERIC;
BEGIN
    -- Lock order
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    IF v_order.buyer_id != p_buyer_id THEN
        RAISE EXCEPTION 'Only the buyer can confirm delivery and release escrow';
    END IF;

    IF v_order.status NOT IN ('Paid', 'Shipped') THEN
        RAISE EXCEPTION 'Order must be Paid or Shipped. Current status: %', v_order.status;
    END IF;

    IF v_order.escrow_status != 'Held' THEN
        RAISE EXCEPTION 'Escrow status is not Held. Current status: %', v_order.escrow_status;
    END IF;

    v_payout_amount := COALESCE(v_order.seller_payout_amount, v_order.total_amount, 0);

    -- Update Order
    UPDATE public.orders
    SET status = 'Delivered',
        escrow_status = 'Released',
        escrow_released_at = NOW(),
        refund_status = CASE WHEN refund_status = 'Requested' THEN 'Rejected' ELSE refund_status END,
        delivery_verification_otp = NULL,
        delivery_verification_expires_at = NULL,
        delivery_otp_attempts = 0,
        updated_at = NOW()
    WHERE id = p_order_id;

    -- Lock and Update Seller Wallet
    SELECT * INTO v_seller_wallet
    FROM public.wallets
    WHERE user_id = v_order.seller_id
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO public.wallets (user_id, balance, pending_balance, currency)
        VALUES (v_order.seller_id, v_payout_amount, 0, 'GHS')
        RETURNING * INTO v_seller_wallet;
        v_seller_balance_before := 0;
        v_seller_balance_after := v_payout_amount;
    ELSE
        v_seller_balance_before := COALESCE(v_seller_wallet.balance, 0);
        v_seller_pending_before := COALESCE(v_seller_wallet.pending_balance, 0);
        v_seller_balance_after := v_seller_balance_before + v_payout_amount;
        v_seller_pending_after := GREATEST(0, v_seller_pending_before - v_payout_amount);

        UPDATE public.wallets
        SET balance = v_seller_balance_after,
            pending_balance = v_seller_pending_after,
            updated_at = NOW()
        WHERE id = v_seller_wallet.id;
    END IF;

    -- Insert Transaction
    INSERT INTO public.wallet_transactions (
        wallet_id,
        order_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        status,
        reference,
        description,
        admin_notes
    ) VALUES (
        v_seller_wallet.id,
        p_order_id,
        'Credit',
        v_payout_amount,
        v_seller_balance_before,
        v_seller_balance_after,
        'Completed',
        p_order_id::text,
        'Escrow Released',
        'Escrow released upon delivery confirmation'
    );

    -- Insert History
    INSERT INTO public.order_status_history (
        order_id,
        old_status,
        new_status,
        changed_by,
        notes
    ) VALUES (
        p_order_id,
        v_order.status,
        'Delivered',
        p_buyer_id,
        'Delivery confirmed by buyer, escrow released atomically'
    );

    -- Create Notifications
    INSERT INTO public.notifications (user_id, type, title, message, related_order_id)
    VALUES
    (v_order.seller_id, 'EscrowReleased', 'Escrow Released', 'GHS ' || round(v_payout_amount, 2)::text || ' released to your wallet for order #' || substring(p_order_id::text from 1 for 8) || '.', p_order_id),
    (v_order.seller_id, 'DeliveryConfirmed', 'Delivery Confirmed', 'The buyer has confirmed delivery for order #' || substring(p_order_id::text from 1 for 8) || '.', p_order_id);

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'payout_amount', v_payout_amount,
        'seller_id', v_order.seller_id
    );
END;
$$;


-- 4. Storage Security: Fix chat-attachments delete policy
DROP POLICY IF EXISTS "Allow users to delete their own uploads" ON storage.objects;
CREATE POLICY "Allow users to delete their own uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'chat-attachments' AND
    (storage.foldername(name))[1] = auth.uid()::text
);
