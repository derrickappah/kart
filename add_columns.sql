-- Run this in your Supabase SQL Editor to add the missing columns

-- Add image_url column if it doesn't exist
alter table products 
add column if not exists image_url text;

-- Add images array column if it doesn't exist
alter table products 
add column if not exists images text[];

-- Ensure seller_id is UUID (fixes potential type mismatch issues)
-- (Optional safety check, usually not needed if table created via dashboard default)
-- alter table products 
-- alter column seller_id type uuid using seller_id::uuid;
