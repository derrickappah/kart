-- Refund System Schema
-- Adds support for buyers to request refunds and admins to track/process them.

-- 1. Create refund_requests table
CREATE TABLE IF NOT EXISTS refund_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) NOT NULL,
    buyer_id UUID REFERENCES auth.users(id) NOT NULL,
    reason TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add refund_status to orders table for quick tracking
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS refund_status TEXT DEFAULT 'None' CHECK (refund_status IN ('None', 'Requested', 'Refunded', 'Rejected'));

-- 3. Enable RLS on refund_requests
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;

-- 4. Policies for refund_requests
CREATE POLICY "Buyers can view their own refund requests"
ON refund_requests FOR SELECT
USING (auth.uid() = buyer_id);

CREATE POLICY "Buyers can create refund requests for their orders"
ON refund_requests FOR INSERT
WITH CHECK (
    auth.uid() = buyer_id AND
    EXISTS (
        SELECT 1 FROM orders
        WHERE id = order_id AND buyer_id = auth.uid()
    )
);

CREATE POLICY "Admins can view all refund requests"
ON refund_requests FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND is_admin = true
    )
);

CREATE POLICY "Admins can update refund requests"
ON refund_requests FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND is_admin = true
    )
);

-- 5. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_refund_requests_order_id ON refund_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_buyer_id ON refund_requests(buyer_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON refund_requests(status);
