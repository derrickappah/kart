-- RLS Fix for Admin Access
-- Created at: 2026-02-18

-- 1. Enable RLS on profiles (just to be safe, though likely already enabled)
alter table profiles enable row level security;

-- 2. Policy: Users can view their own profile (including is_admin status)
-- This is critical for the client-side admin check to work
create policy "Users can view own profile"
  on profiles for select
  using ( auth.uid() = id );

-- 3. Policy: Admins can view all profiles
-- This allows admins to see other users in the User Management page
create policy "Admins can view all profiles"
  on profiles for select
  using ( 
    exists (
      select 1 from profiles
      where id = auth.uid() 
      and is_admin = true
    )
  );
