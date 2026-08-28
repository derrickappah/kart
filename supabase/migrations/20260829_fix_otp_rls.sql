-- Fix insecure open RLS policies on verification tables
-- Drop open permissive policies that allowed any client to read/modify OTPs
DROP POLICY IF EXISTS System can manage email verifications ON public.email_verifications;
DROP POLICY IF EXISTS System can manage phone verifications ON public.phone_verifications;

-- Ensure RLS is active on both tables
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;

-- Note: Server routes use createServiceRoleClient() which bypasses RLS.
-- No public policies are needed for anon/authenticated clients, preventing unauthorized PostgREST queries.
