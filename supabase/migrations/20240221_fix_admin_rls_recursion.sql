-- RLS Fix: Infinite Recursion
-- The previous policy caused infinite recursion because querying 'profiles' 
-- to check if you are an admin triggered the 'profiles' policy again.

-- 1. Create a secure function to check admin status
-- SECURITY DEFINER functions run with the privileges of the creator (superuser),
-- bypassing RLS on the table they access. This breaks the recursion loop.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public -- Secure the search path
as $$
  select exists (
    select 1
    from profiles
    where id = auth.uid()
    and is_admin = true
  );
$$;

-- 2. Drop the problematic policies (if they exist)
drop policy if exists "Admins can view all profiles" on profiles;
drop policy if exists "Users can view own profile" on profiles;

-- 3. Re-create "Users can view own profile" policy (Safe)
create policy "Users can view own profile"
  on profiles for select
  using ( auth.uid() = id );

-- 4. Re-create "Admins can view all profiles" policy using the secure function
create policy "Admins can view all profiles"
  on profiles for select
  using ( is_admin() );
