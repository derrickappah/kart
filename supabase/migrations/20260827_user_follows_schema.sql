-- User Follows Schema
create table if not exists follows (
  id uuid default gen_random_uuid() primary key,
  follower_id uuid references auth.users(id) on delete cascade not null,
  following_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_follower_following unique(follower_id, following_id),
  constraint no_self_follow check (follower_id != following_id)
);

-- Enable Row Level Security
alter table follows enable row level security;

-- Policies
create policy "Anyone can view follows"
  on follows for select
  using (true);

create policy "Users can follow others"
  on follows for insert
  with check (auth.uid() = follower_id);

create policy "Users can unfollow"
  on follows for delete
  using (auth.uid() = follower_id);

-- Performance Indexes
create index if not exists follows_follower_id_idx on follows(follower_id);
create index if not exists follows_following_id_idx on follows(following_id);
create index if not exists follows_created_at_idx on follows(created_at desc);