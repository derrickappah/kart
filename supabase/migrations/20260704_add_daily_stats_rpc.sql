-- Create function to aggregate views and clicks daily in-database
create or replace function get_ad_daily_stats(ad_id uuid)
returns table(day text, views bigint, clicks bigint) as $$
begin
  return query
  select 
    to_char(created_at at time zone 'utc', 'Mon FMDD') as day,
    count(*) filter (where event_type = 'view') as views,
    count(*) filter (where event_type = 'click') as clicks
  from ad_campaigns
  where advertisement_id = ad_id
  group by date_trunc('day', created_at at time zone 'utc'), to_char(created_at at time zone 'utc', 'Mon FMDD')
  order by date_trunc('day', created_at at time zone 'utc') asc;
end;
$$ language plpgsql security definer;
