-- Analytics Setup Migration

-- 1. Add count columns to products table if they don't exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name='products' and column_name='views_count') then
    alter table products add column views_count int default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='products' and column_name='shares_count') then
    alter table products add column shares_count int default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='products' and column_name='likes_count') then
    alter table products add column likes_count int default 0;
  end if;
end $$;

-- 2. Create RPC functions for atomic increment
create or replace function increment_product_views(product_id uuid)
returns void as $$
begin
  update products
  set views_count = coalesce(views_count, 0) + 1
  where id = product_id;
end;
$$ language plpgsql security definer;

create or replace function increment_product_shares(product_id uuid)
returns void as $$
begin
  update products
  set shares_count = coalesce(shares_count, 0) + 1
  where id = product_id;
end;
$$ language plpgsql security definer;

-- 3. Trigger to keep likes_count in sync with wishlist table
create or replace function update_product_likes_count()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update products
    set likes_count = coalesce(likes_count, 0) + 1
    where id = NEW.product_id;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    update products
    set likes_count = greatest(0, coalesce(likes_count, 0) - 1)
    where id = OLD.product_id;
    return OLD;
  end if;
  return null;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists to avoid errors on re-run
drop trigger if exists wishlist_likes_sync on wishlist;

create trigger wishlist_likes_sync
after insert or delete on wishlist
for each row
execute function update_product_likes_count();

-- 4. Set initial likes_count based on existing wishlist entries
update products p
set likes_count = (
  select count(*)
  from wishlist w
  where w.product_id = p.id
);
