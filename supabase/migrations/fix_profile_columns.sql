-- 1. Add 'display_name' column if it doesn't exist
alter table profiles 
add column if not exists display_name text;

-- 2. Add 'email' column if it doesn't exist (just in case)
alter table profiles 
add column if not exists email text;

-- 3. Now retry the backfill
insert into public.profiles (id, email, display_name)
select 
  id, 
  email, 
  coalesce(raw_user_meta_data->>'full_name', email) as display_name
from auth.users
where id not in (select id from public.profiles);
