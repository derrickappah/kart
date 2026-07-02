-- Add delivery_pin_hash column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS delivery_pin_hash TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN public.profiles.delivery_pin_hash IS 'Bcrypt-hashed 6-digit PIN used by the buyer to confirm item delivery and release escrow.';
