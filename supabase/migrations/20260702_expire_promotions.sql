-- Migration to expire completed promotions and advertisements
create or replace function expire_completed_promotions()
returns void as $$
begin
  -- 1. Update products associated with expired Featured/Boost advertisements
  update products p
  set 
    is_featured = case when a.ad_type = 'Featured' then false else p.is_featured end,
    is_boosted = case when a.ad_type = 'Boost' then false else p.is_boosted end
  from advertisements a
  where p.id = a.product_id
    and a.status = 'Active'
    and a.end_date < now();

  -- 2. Update expired advertisements status
  update advertisements
  set status = 'Expired', updated_at = now()
  where status = 'Active'
    and end_date < now();

  -- 3. Cleanup any dangling boosted products (safety fallback)
  update products
  set is_boosted = false
  where is_boosted = true
    and boost_expires_at < now();
end;
$$ language plpgsql security definer;
