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
  -- Note: The sync_product_promotion_trigger on the advertisements table
  -- will automatically handle updating the products' is_featured, is_boosted, and boost_expires_at!
  update advertisements
  set status = 'Expired', updated_at = now()
  where status = 'Active'
    and end_date < now();

  -- B. Cleanup any dangling boosted products where boost_expires_at is in the past (safety fallback)
  update products
  set is_boosted = false, boost_expires_at = null
  where is_boosted = true
    and (boost_expires_at < now() or boost_expires_at is null);
end;
$$ language plpgsql security definer;

-- 3. Create trigger function to end promotions automatically when a product status changes from Active
create or replace function handle_product_status_change()
returns trigger as $$
begin
  if NEW.status <> 'Active' and OLD.status = 'Active' then
    -- Set promotion flags on product to false
    NEW.is_featured := false;
    NEW.is_boosted := false;
    NEW.boost_expires_at := null;

    -- Set skip flag to avoid locking products table recursively
    perform set_config('kart.skip_product_sync', 'true', true);

    -- Update all active advertisements for this product to Expired
    update advertisements
    set status = 'Expired', end_date = now(), updated_at = now()
    where product_id = NEW.id and status = 'Active';

    -- Reset skip flag
    perform set_config('kart.skip_product_sync', 'false', true);
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
