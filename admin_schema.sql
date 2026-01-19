-- 1. Add is_admin column to profiles
alter table profiles 
add column if not exists is_admin boolean default false;

-- 2. Policy: Admins can view all profiles
-- (Existing policies might restrict this, so we might need a new one)
create policy "Admins can view all profiles"
  on profiles for select
  using ( is_admin = true );

-- 3. Policy: Admins can delete any product (Moderation)
create policy "Admins can delete any product"
  on products for delete
  using ( 
    exists (
      select 1 from profiles
      where id = auth.uid() 
      and is_admin = true
    )
  );

-- 4. Set YOUR email as admin (Replace 'your_email@example.com' with the actual email)
-- update profiles set is_admin = true where email = 'your_email@example.com';
