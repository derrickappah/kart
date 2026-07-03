-- Promote Feature Improvements Migration

-- 1. Create increment_ad_stat function to safely track views and clicks
create or replace function increment_ad_stat(ad_id uuid, stat_field text)
returns void as $$
begin
  if stat_field = 'views' then
    update advertisements
    set views = coalesce(views, 0) + 1, updated_at = now()
    where id = ad_id;
  elsif stat_field = 'clicks' then
    update advertisements
    set clicks = coalesce(clicks, 0) + 1, updated_at = now()
    where id = ad_id;
  end if;
end;
$$ language plpgsql security definer;

-- 2. Update expire_completed_promotions to handle overlapping/queued promotions robustly
create or replace function expire_completed_promotions()
returns void as $$
begin
  -- A. Update expired advertisements status to 'Expired'
  update advertisements
  set status = 'Expired', updated_at = now()
  where status = 'Active'
    and end_date < now();

  -- B. Recalculate is_featured, is_boosted, and boost_expires_at for all products that have advertisements
  update products p
  set
    is_featured = exists (
      select 1 from advertisements a
      where a.product_id = p.id
        and a.ad_type = 'Featured'
        and a.status = 'Active'
        and a.start_date <= now()
        and a.end_date >= now()
    ),
    is_boosted = exists (
      select 1 from advertisements a
      where a.product_id = p.id
        and a.ad_type = 'Boost'
        and a.status = 'Active'
        and a.start_date <= now()
        and a.end_date >= now()
    ),
    boost_expires_at = (
      select max(a.end_date) from advertisements a
      where a.product_id = p.id
        and a.ad_type = 'Boost'
        and a.status = 'Active'
        and a.end_date >= now()
    )
  where p.id in (
    select distinct product_id from advertisements
  );

  -- C. Cleanup any dangling boosted products where boost_expires_at is in the past (safety fallback)
  update products
  set is_boosted = false, boost_expires_at = null
  where is_boosted = true
    and (boost_expires_at < now() or boost_expires_at is null);
end;
$$ language plpgsql security definer;

-- 3. Create trigger function to end promotions automatically when a product is marked as Sold
create or replace function handle_product_status_change()
returns trigger as $$
begin
  if NEW.status = 'Sold' and OLD.status <> 'Sold' then
    -- Set promotion flags on product to false
    NEW.is_featured := false;
    NEW.is_boosted := false;
    NEW.boost_expires_at := null;

    -- Update all active advertisements for this product to Expired
    update advertisements
    set status = 'Expired', end_date = now(), updated_at = now()
    where product_id = NEW.id and status = 'Active';
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

-- Drop trigger if it exists
drop trigger if exists product_status_change_trigger on products;

-- Create the trigger
create trigger product_status_change_trigger
  before update on products
  for each row
  execute function handle_product_status_change();
