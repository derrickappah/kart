-- Create phone_verifications table
CREATE TABLE IF NOT EXISTS public.phone_verifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    phone TEXT NOT NULL,
    otp TEXT NOT NULL,
    attempts INT DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;

-- Policies for phone_verifications
CREATE POLICY "Users can only see their own phone verifications" 
ON public.phone_verifications FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can manage phone verifications" 
ON public.phone_verifications FOR ALL 
USING (true) 
WITH CHECK (true);

-- Add phone_verified to profiles if it doesn't already exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS phone_verifications_otp_idx ON public.phone_verifications(otp);
CREATE INDEX IF NOT EXISTS phone_verifications_user_id_idx ON public.phone_verifications(user_id);
CREATE INDEX IF NOT EXISTS phone_verifications_phone_idx ON public.phone_verifications(phone);
