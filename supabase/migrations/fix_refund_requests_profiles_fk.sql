-- Fix foreign key relationship between refund_requests and profiles
-- Enables Supabase PostgREST to join profiles for buyer details on refund requests

-- 1. Ensure profiles has all users
INSERT INTO profiles (id, email, display_name)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'full_name', email) as display_name
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;

-- 2. Add foreign key constraint from refund_requests.buyer_id to profiles.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'refund_requests'::regclass
        AND confrelid = 'profiles'::regclass
        AND conkey::text LIKE '%buyer_id%'
    ) THEN
        ALTER TABLE refund_requests
        ADD CONSTRAINT refund_requests_buyer_id_profiles_fkey
        FOREIGN KEY (buyer_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;
