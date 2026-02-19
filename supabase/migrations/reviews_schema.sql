-- Ratings & Reviews Schema

create table if not exists reviews (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references orders(id),
  product_id uuid references products(id) on delete cascade not null,
  seller_id uuid references auth.users(id) on delete cascade not null,
  buyer_id uuid references auth.users(id) on delete cascade not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(order_id)
);

-- Add rating columns to profiles table
alter table profiles 
add column if not exists average_rating numeric default 0,
add column if not exists total_reviews integer default 0;

-- Enable RLS
alter table reviews enable row level security;

-- Policies
create policy "Anyone can view reviews"
  on reviews for select
  using (true);

create policy "Buyers can create reviews"
  on reviews for insert
  with check (auth.uid() = buyer_id);

-- Indexes
create index if not exists reviews_seller_id_idx on reviews(seller_id);
create index if not exists reviews_product_id_idx on reviews(product_id);
create index if not exists reviews_buyer_id_idx on reviews(buyer_id);
