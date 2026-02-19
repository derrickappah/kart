-- Function to calculate and update seller rating
create or replace function update_seller_rating()
returns trigger as $$
begin
  update profiles
  set 
    average_rating = (
      select coalesce(avg(rating), 0)
      from reviews
      where seller_id = new.seller_id
    ),
    total_reviews = (
      select count(*)
      from reviews
      where seller_id = new.seller_id
    )
  where id = new.seller_id;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to run after insert, update, or delete on reviews
drop trigger if exists on_review_change on reviews;
create trigger on_review_change
after insert or update of rating or delete on reviews
for each row execute function update_seller_rating();

-- Handle delete case (OLD.seller_id)
create or replace function update_seller_rating_on_delete()
returns trigger as $$
begin
  update profiles
  set 
    average_rating = (
      select coalesce(avg(rating), 0)
      from reviews
      where seller_id = old.seller_id
    ),
    total_reviews = (
      select count(*)
      from reviews
      where seller_id = old.seller_id
    )
  where id = old.seller_id;
  return old;
end;
$$ language plpgsql security definer;

drop trigger if exists on_review_delete on reviews;
create trigger on_review_delete
after delete on reviews
for each row execute function update_seller_rating_on_delete();
