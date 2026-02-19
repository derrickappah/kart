-- Campus Field Schema

-- Add campus column to products table
alter table products 
add column if not exists campus text;

-- Add campus column to profiles table
alter table profiles 
add column if not exists campus text;

-- Index for faster filtering
create index if not exists products_campus_idx on products(campus);
