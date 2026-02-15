-- SQL script to recalculate stats for ALL sellers based on existing reviews
-- Run this in your Supabase SQL Editor to fix '0.0' ratings for existing sellers

do $$
declare
  r record;
begin
  -- Loop through all profiles that are sellers (have an id in reviews as seller_id)
  for r in (select distinct seller_id from reviews) loop
    update profiles
    set 
      average_rating = (
        select coalesce(avg(rating), 0)
        from reviews
        where seller_id = r.seller_id
      ),
      total_reviews = (
        select count(*)
        from reviews
        where seller_id = r.seller_id
      )
    where id = r.seller_id;
  end loop;
end;
$$;
