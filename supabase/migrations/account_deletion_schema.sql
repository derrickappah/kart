-- Account Deletion Requests Schema
-- This table stores user requests for account deletion
-- Actual deletion is handled by admins or automated processes

-- Create the account_deletion_requests table
create table if not exists account_deletion_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  email text not null,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table account_deletion_requests enable row level security;

-- Policy: Users can view their own deletion requests
create policy "Users can view their own deletion requests"
  on account_deletion_requests for select
  using (auth.uid() = user_id);

-- Policy: Users can create their own deletion requests
create policy "Users can create their own deletion requests"
  on account_deletion_requests for insert
  with check (auth.uid() = user_id);

-- Policy: Admins can view all deletion requests
create policy "Admins can view all deletion requests"
  on account_deletion_requests for select
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and is_admin = true
    )
  );

-- Policy: Admins can update deletion requests (approve/reject)
create policy "Admins can update deletion requests"
  on account_deletion_requests for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and is_admin = true
    )
  );

-- Indexes for performance
create index if not exists account_deletion_requests_user_id_idx on account_deletion_requests(user_id);
create index if not exists account_deletion_requests_status_idx on account_deletion_requests(status);
create index if not exists account_deletion_requests_created_at_idx on account_deletion_requests(created_at);

-- Trigger to update updated_at timestamp
create or replace function update_account_deletion_requests_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger update_account_deletion_requests_updated_at
  before update on account_deletion_requests
  for each row
  execute function update_account_deletion_requests_updated_at();
