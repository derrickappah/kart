-- Add delivery_otp_attempts column to orders table for brute-force protection
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS delivery_otp_attempts INTEGER NOT NULL DEFAULT 0;

-- Add comment explaining the column
COMMENT ON COLUMN public.orders.delivery_otp_attempts IS 'Tracks failed delivery PIN verification attempts per order for brute-force protection.';
