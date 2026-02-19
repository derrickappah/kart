-- Update orders status check constraint to support 'Refunded'
-- Run this in your Supabase SQL Editor

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders 
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('Pending', 'Paid', 'Delivered', 'Cancelled', 'Refunded', 'pending', 'paid', 'delivered', 'cancelled', 'refunded'));

-- Also check if escrow_status needs updating (though not explicitly mentioned in the error, it's good practice)
DO $$
BEGIN
    IF EXISTS (
        select 1 from information_schema.table_constraints 
        where table_name = 'orders' and constraint_name = 'orders_escrow_status_check'
    ) THEN
        ALTER TABLE orders DROP CONSTRAINT orders_escrow_status_check;
        ALTER TABLE orders 
        ADD CONSTRAINT orders_escrow_status_check 
        CHECK (escrow_status IN ('Held', 'Released', 'Refunded', 'held', 'released', 'refunded'));
    END IF;
END $$;
