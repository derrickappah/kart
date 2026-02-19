-- 1. Create the 'products' table if it doesn't exist
create table if not exists products (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  description text,
  price numeric not null,
  category text,
  condition text,
  image_url text, -- Kept for backward compatibility/main image
  images text[],  -- Array of image URLs
  status text default 'Active',
  seller_id uuid references auth.users not null
);

-- 2. Enable RLS on products table
alter table products enable row level security;

-- 3. Policy: Everyone can view active products
create policy "Public products are viewable by everyone"
  on products for select
  using ( true );

-- 4. Policy: Authenticated users can insert their own products
create policy "Users can insert their own products"
  on products for insert
  with check ( auth.uid() = seller_id );

-- 5. Policy: Sellers can update their own products
create policy "Users can update their own products"
  on products for update
  using ( auth.uid() = seller_id );

-- ==========================================
-- STORAGE SETUP
-- ==========================================

-- 6. Create the 'products' bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

-- 7. Policy: Allow authenticated users to upload files to 'products' bucket
-- Note: 'storage.objects' is the table managing files
create policy "Authenticated users can upload images"
  on storage.objects for insert
  with check (
    bucket_id = 'products' AND
    auth.role() = 'authenticated'
  );

-- 8. Policy: Allow everyone to view files in 'products' bucket (since it's public)
create policy "Public Access to Product Images"
  on storage.objects for select
  using ( bucket_id = 'products' );
