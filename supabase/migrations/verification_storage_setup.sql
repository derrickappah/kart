-- Verification Storage Setup
-- This script sets up storage for ID verification documents

-- 1. Create the 'verifications' storage bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('verifications', 'verifications', false) -- Private bucket for sensitive data
on conflict (id) do nothing;

-- 2. Drop existing policies if they exist and recreate them
do $$ 
begin
  -- Drop policies if they exist
  drop policy if exists "Users can upload their own verification IDs" on storage.objects;
  drop policy if exists "Users can view their own verification IDs" on storage.objects;
  drop policy if exists "Admins can view all verification IDs" on storage.objects;
end $$;

-- 3. Policy: Allow authenticated users to upload their own verification IDs
create policy "Users can upload their own verification IDs"
  on storage.objects for insert
  with check (
    bucket_id = 'verifications' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. Policy: Allow users to view their own verification IDs
create policy "Users can view their own verification IDs"
  on storage.objects for select
  using (
    bucket_id = 'verifications' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5. Policy: Allow admins to view all verification IDs
create policy "Admins can view all verification IDs"
  on storage.objects for select
  using (
    bucket_id = 'verifications' AND
    exists (
      select 1 from profiles
      where id = auth.uid()
      and is_admin = true
    )
  );
