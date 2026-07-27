-- Complete Fix for Orders Status Check Constraints
-- Ensures all status states used in application logic ('Pending', 'Paid', 'Shipped', 'Delivered', 'Completed', 'Cancelled', 'Refunded') are allowed by PostgreSQL constraints.

-- 1. Update orders_status_check
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders 
ADD CONSTRAINT orders_status_check 
CHECK (status IN (
    'Pending', 'Paid', 'Shipped', 'Delivered', 'Completed', 'Cancelled', 'Refunded',
    'pending', 'paid', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded'
));

-- 2. Update orders_escrow_status_check
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'orders' AND constraint_name = 'orders_escrow_status_check'
    ) THEN
        ALTER TABLE orders DROP CONSTRAINT orders_escrow_status_check;
    END IF;
END $$;

ALTER TABLE orders 
ADD CONSTRAINT orders_escrow_status_check 
CHECK (escrow_status IN (
    'Held', 'Released', 'Refunded',
    'held', 'released', 'refunded'
));

-- 3. Update orders_refund_status_check
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'orders' AND constraint_name = 'orders_refund_status_check'
    ) THEN
        ALTER TABLE orders DROP CONSTRAINT orders_refund_status_check;
    END IF;
END $$;

ALTER TABLE orders 
ADD CONSTRAINT orders_refund_status_check 
CHECK (refund_status IN (
    'None', 'Requested', 'Refunded', 'Rejected',
    'none', 'requested', 'refunded', 'rejected'
));
