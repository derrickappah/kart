-- Trigger to keep products table in sync with advertisements table
create or replace function sync_product_promotion_fields()
returns trigger as $$
declare
  target_product_id uuid;
begin
  -- Bypass sync if skip flag is set
  if current_setting('kart.skip_product_sync', true) = 'true' then
    return null;
  end if;

  if TG_OP = 'DELETE' then
    target_product_id := OLD.product_id;
  else
    target_product_id := NEW.product_id;
  end if;

  update products p
  set
    is_featured = exists (
      select 1 from advertisements a
      where a.product_id = target_product_id
        and a.ad_type = 'Featured'
        and a.status = 'Active'
        and a.start_date <= now()
        and a.end_date >= now()
    ),
    is_boosted = exists (
      select 1 from advertisements a
      where a.product_id = target_product_id
        and a.ad_type = 'Boost'
        and a.status = 'Active'
        and a.start_date <= now()
        and a.end_date >= now()
    ),
    boost_expires_at = (
      select max(a.end_date) from advertisements a
      where a.product_id = target_product_id
        and a.ad_type = 'Boost'
        and a.status = 'Active'
        and a.end_date >= now()
    )
  where p.id = target_product_id;

  return null;
end;
$$ language plpgsql security definer;

-- Drop trigger if it exists
drop trigger if exists sync_product_promotion_trigger on advertisements;

-- Create the trigger
create trigger sync_product_promotion_trigger
  after insert or update or delete on advertisements
  for each row
  execute function sync_product_promotion_fields();
