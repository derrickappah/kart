-- Profile Storage Setup
-- This script sets up storage for user profile pictures

-- 1. Create the 'profiles' storage bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('profiles', 'profiles', true)
on conflict (id) do nothing;

-- 2. Add avatar_url column to profiles table if it doesn't exist
do $$ 
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'profiles' and column_name = 'avatar_url'
  ) then
    alter table profiles add column avatar_url text;
  end if;
end $$;

-- 3. Drop existing policies if they exist and recreate them
do $$ 
begin
  -- Drop policies if they exist
  drop policy if exists "Users can upload their own profile pictures" on storage.objects;
  drop policy if exists "Users can update their own profile pictures" on storage.objects;
  drop policy if exists "Users can delete their own profile pictures" on storage.objects;
  drop policy if exists "Public Access to Profile Pictures" on storage.objects;
end $$;

-- 4. Policy: Allow authenticated users to upload their own profile pictures
create policy "Users can upload their own profile pictures"
  on storage.objects for insert
  with check (
    bucket_id = 'profiles' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5. Policy: Allow users to update their own profile pictures
create policy "Users can update their own profile pictures"
  on storage.objects for update
  using (
    bucket_id = 'profiles' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 6. Policy: Allow users to delete their own profile pictures
create policy "Users can delete their own profile pictures"
  on storage.objects for delete
  using (
    bucket_id = 'profiles' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 7. Policy: Allow everyone to view profile pictures (since bucket is public)
create policy "Public Access to Profile Pictures"
  on storage.objects for select
  using ( bucket_id = 'profiles' );
