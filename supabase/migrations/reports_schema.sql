-- Product Reporting Schema

create table if not exists reports (
  id uuid default gen_random_uuid() primary key,
  reporter_id uuid references auth.users(id) on delete cascade not null,
  product_id uuid references products(id) on delete cascade not null,
  reason text not null,
  description text,
  status text not null default 'Pending' check (status in ('Pending', 'Reviewed', 'Resolved', 'Dismissed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table reports enable row level security;

-- Policies
create policy "Users can view their own reports"
  on reports for select
  using (auth.uid() = reporter_id);

create policy "Users can create reports"
  on reports for insert
  with check (auth.uid() = reporter_id);

create policy "Admins can view all reports"
  on reports for select
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and is_admin = true
    )
  );

create policy "Admins can update reports"
  on reports for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and is_admin = true
    )
  );

-- Indexes
create index if not exists reports_product_id_idx on reports(product_id);
create index if not exists reports_reporter_id_idx on reports(reporter_id);
create index if not exists reports_status_idx on reports(status);
