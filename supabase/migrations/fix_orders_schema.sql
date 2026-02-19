-- SQL Migration: Add missing payment-related columns to the orders table
-- Run this in your Supabase SQL Editor

-- 1. Add payment_method column
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_method text;

-- 2. Add payment_reference column
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_reference text;

-- 3. Add paystack_transaction_id column
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS paystack_transaction_id text;

-- 4. Add escrow_status column (if missing)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS escrow_status text DEFAULT 'Held';

-- 5. Add platform fee columns (if missing, as seen in some routes)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS platform_fee_total numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS seller_payout_amount numeric DEFAULT 0;

-- Optional: Add index for reference lookups
CREATE INDEX IF NOT EXISTS orders_payment_reference_idx ON orders(payment_reference);
