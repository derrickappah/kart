-- Seller Verification Schema

-- Add verification columns to profiles table
alter table profiles 
add column if not exists is_verified boolean default false,
add column if not exists student_id text,
add column if not exists verification_status text default 'Pending' check (verification_status in ('Pending', 'Approved', 'Rejected'));

-- Create verification_requests table
create table if not exists verification_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  student_id text not null,
  student_id_image text,
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected')),
  admin_notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table verification_requests enable row level security;

-- Policies
create policy "Users can view their own verification requests"
  on verification_requests for select
  using (auth.uid() = user_id);

create policy "Users can create verification requests"
  on verification_requests for insert
  with check (auth.uid() = user_id);

create policy "Admins can view all verification requests"
  on verification_requests for select
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and is_admin = true
    )
  );

create policy "Admins can update verification requests"
  on verification_requests for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and is_admin = true
    )
  );

-- Indexes
create index if not exists verification_requests_user_id_idx on verification_requests(user_id);
create index if not exists verification_requests_status_idx on verification_requests(status);
