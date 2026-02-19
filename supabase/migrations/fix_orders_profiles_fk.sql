-- Fix foreign key relationships between orders and profiles
-- This allows Supabase to recognize the relationship for joins

-- Step 1: Ensure profiles table exists and has all users
-- (This should already be done, but ensuring it's safe)
INSERT INTO profiles (id, email, display_name)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'full_name', email) as display_name
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Drop existing foreign key constraints if they point to auth.users
-- and recreate them to point to profiles instead
DO $$
DECLARE
    fk_record RECORD;
BEGIN
    -- Find and drop foreign keys from orders.seller_id to auth.users
    FOR fk_record IN 
        SELECT conname, conrelid::regclass as table_name
        FROM pg_constraint
        WHERE conrelid = 'orders'::regclass
        AND confrelid = 'auth.users'::regclass
        AND (conkey::text LIKE '%seller_id%' OR conkey::text LIKE '%buyer_id%')
    LOOP
        EXECUTE format('ALTER TABLE orders DROP CONSTRAINT IF EXISTS %I', fk_record.conname);
    END LOOP;
END $$;

-- Step 3: Add foreign key constraints from orders to profiles
DO $$
BEGIN
    -- Add foreign key from orders.seller_id to profiles.id
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'orders'::regclass
        AND confrelid = 'profiles'::regclass
        AND conkey::text LIKE '%seller_id%'
    ) THEN
        ALTER TABLE orders
        ADD CONSTRAINT orders_seller_id_profiles_fkey
        FOREIGN KEY (seller_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;

    -- Add foreign key from orders.buyer_id to profiles.id
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'orders'::regclass
        AND confrelid = 'profiles'::regclass
        AND conkey::text LIKE '%buyer_id%'
    ) THEN
        ALTER TABLE orders
        ADD CONSTRAINT orders_buyer_id_profiles_fkey
        FOREIGN KEY (buyer_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 4: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS orders_seller_id_idx ON orders(seller_id);
CREATE INDEX IF NOT EXISTS orders_buyer_id_idx ON orders(buyer_id);
