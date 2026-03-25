-- Add delivery verification columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS delivery_verification_otp text,
ADD COLUMN IF NOT EXISTS delivery_verification_expires_at timestamp with time zone;

-- Create an index for faster lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS orders_delivery_verification_otp_idx ON orders(delivery_verification_otp);
