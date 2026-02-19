-- Wishlist Schema

create table if not exists wishlist (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  product_id uuid references products(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, product_id)
);

-- Enable RLS
alter table wishlist enable row level security;

-- Policies
create policy "Users can view their own wishlist"
  on wishlist for select
  using (auth.uid() = user_id);

create policy "Users can add to their wishlist"
  on wishlist for insert
  with check (auth.uid() = user_id);

create policy "Users can remove from their wishlist"
  on wishlist for delete
  using (auth.uid() = user_id);

-- Indexes
create index if not exists wishlist_user_id_idx on wishlist(user_id);
create index if not exists wishlist_product_id_idx on wishlist(product_id);
