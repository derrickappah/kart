-- The error "violates foreign key constraint" means the seller_id (User ID) 
-- is missing from the table being referenced (likely 'public.profiles').

-- 1. Ensure the 'profiles' table exists
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  display_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Backfill missing profiles for existing users
-- This takes every user from auth.users (who has signed up)
-- and creates a row in public.profiles if it's missing.
insert into public.profiles (id, email, display_name)
select 
  id, 
  email, 
  coalesce(raw_user_meta_data->>'full_name', email) as display_name
from auth.users
where id not in (select id from public.profiles);

-- 3. (Optional) Re-verify constraints if strictly needed, 
-- but usually backfilling the data is enough to satisfy the FK.
