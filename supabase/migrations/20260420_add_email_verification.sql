-- Create email_verifications table
CREATE TABLE IF NOT EXISTS public.email_verifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    otp TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

-- Policies for email_verifications
CREATE POLICY "Users can only see their own email verifications" 
ON public.email_verifications FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can manage email verifications" 
ON public.email_verifications FOR ALL 
USING (true) 
WITH CHECK (true);

-- Add email_verified to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- Create index for faster OTP lookups
CREATE INDEX IF NOT EXISTS email_verifications_otp_idx ON public.email_verifications(otp);
CREATE INDEX IF NOT EXISTS email_verifications_user_id_idx ON public.email_verifications(user_id);
