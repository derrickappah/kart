-- Fix Products -> Profiles Relationship
-- This ensures the seller_id in products correctly references the profiles table

-- 1. Ensure all sellers have a profile
INSERT INTO profiles (id, email, display_name)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'full_name', email) as display_name
FROM auth.users
WHERE id IN (SELECT seller_id FROM products)
AND id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing seller_id constraint if it points to auth.users and point it to profiles
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'products'::regclass 
        AND conname = 'products_seller_id_fkey'
    ) THEN
        ALTER TABLE products DROP CONSTRAINT products_seller_id_fkey;
    END IF;
END $$;

ALTER TABLE products
ADD CONSTRAINT products_seller_id_profiles_fkey
FOREIGN KEY (seller_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 3. Ensure wishlist -> products relationship is correct
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'wishlist'::regclass 
        AND confrelid = 'products'::regclass
    ) THEN
        ALTER TABLE wishlist
        ADD CONSTRAINT wishlist_product_id_fkey
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
    END IF;
END $$;
