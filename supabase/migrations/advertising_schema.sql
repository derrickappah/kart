-- Advertising & Promotion System Schema

-- Add advertising columns to products table
alter table products 
add column if not exists is_featured boolean default false,
add column if not exists is_boosted boolean default false,
add column if not exists boost_expires_at timestamp with time zone;

-- Create advertisements table
create table if not exists advertisements (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references products(id) on delete cascade,
  seller_id uuid references auth.users(id) on delete cascade not null,
  ad_type text not null check (ad_type in ('Featured', 'Boost', 'Featured Seller', 'Campus Ad')),
  status text not null default 'Active' check (status in ('Active', 'Paused', 'Expired', 'Cancelled')),
  start_date timestamp with time zone not null,
  end_date timestamp with time zone not null,
  views integer default 0,
  clicks integer default 0,
  cost numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create ad_campaigns table for tracking
create table if not exists ad_campaigns (
  id uuid default gen_random_uuid() primary key,
  advertisement_id uuid references advertisements(id) on delete cascade not null,
  event_type text not null check (event_type in ('view', 'click')),
  user_id uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table advertisements enable row level security;
alter table ad_campaigns enable row level security;

-- Policies for advertisements
create policy "Anyone can view active advertisements"
  on advertisements for select
  using (status = 'Active');

create policy "Sellers can view their own advertisements"
  on advertisements for select
  using (auth.uid() = seller_id);

create policy "Sellers can create advertisements"
  on advertisements for insert
  with check (auth.uid() = seller_id);

create policy "Sellers can update their own advertisements"
  on advertisements for update
  using (auth.uid() = seller_id);

-- Policies for ad_campaigns
create policy "Anyone can insert ad campaign events"
  on ad_campaigns for insert
  with check (true);

create policy "Sellers can view their ad campaign events"
  on ad_campaigns for select
  using (
    exists (
      select 1 from advertisements
      where id = ad_campaigns.advertisement_id
      and seller_id = auth.uid()
    )
  );

-- Indexes
create index if not exists advertisements_product_id_idx on advertisements(product_id);
create index if not exists advertisements_seller_id_idx on advertisements(seller_id);
create index if not exists advertisements_status_idx on advertisements(status);
create index if not exists advertisements_end_date_idx on advertisements(end_date);
create index if not exists products_is_featured_idx on products(is_featured);
create index if not exists products_is_boosted_idx on products(is_boosted);
create index if not exists ad_campaigns_advertisement_id_idx on ad_campaigns(advertisement_id);
