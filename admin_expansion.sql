-- 1. Add 'banned' column to profiles
alter table profiles 
add column if not exists banned boolean default false;

-- 2. Update Product Status Constraint to include 'Banned'
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_status_check;

ALTER TABLE products 
ADD CONSTRAINT products_status_check 
CHECK (status IN ('Active', 'Sold', 'Pending', 'Banned', 'active', 'sold', 'pending', 'banned'));

-- 3. Policy: Admins can update profiles (to ban them)
-- We need to ensure the policy allows admins to modify other users' rows
create policy "Admins can update any profile"
  on profiles for update
  using ( 
    exists (
      select 1 from profiles
      where id = auth.uid() 
      and is_admin = true
    )
  );

-- 4. Policy: Admins can update any product (to flag/ban/edit status)
create policy "Admins can update any product"
  on products for update
  using ( 
    exists (
      select 1 from profiles
      where id = auth.uid() 
      and is_admin = true
    )
  );
