-- Migration: Add free_listings_used to profiles for 3-listing free trial tracking

-- 1. Add free_listings_used column to profiles if it doesn't exist
alter table profiles 
add column if not exists free_listings_used integer default 0;

-- 2. Backfill free_listings_used with existing product counts for users
update profiles p
set free_listings_used = coalesce((
    select count(*) 
    from products 
    where seller_id = p.id
), 0)
where p.free_listings_used is null or p.free_listings_used = 0;
