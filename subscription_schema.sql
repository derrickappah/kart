-- Subscription System Schema

-- Create subscription_plans table
create table if not exists subscription_plans (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  price numeric not null,
  duration_months integer not null,
  features text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert default plans
insert into subscription_plans (name, price, duration_months, features) values
  ('Monthly', 10, 1, array['Unlimited listings', 'Seller dashboard', 'Basic analytics']),
  ('6-Month', 50, 6, array['Unlimited listings', 'Seller dashboard', 'Basic analytics', 'Featured seller badge', 'Priority support']),
  ('Yearly', 100, 12, array['Unlimited listings', 'Seller dashboard', 'Basic analytics', 'Featured seller badge', 'Priority support', 'Maximum visibility', 'Early feature access'])
on conflict do nothing;

-- Create subscriptions table
create table if not exists subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  plan_id uuid references subscription_plans(id) not null,
  status text not null default 'Active' check (status in ('Active', 'Expired', 'Cancelled', 'Pending')),
  start_date timestamp with time zone not null,
  end_date timestamp with time zone not null,
  auto_renew boolean default false,
  payment_reference text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table subscription_plans enable row level security;
alter table subscriptions enable row level security;

-- Policies for subscription_plans (public read)
create policy "Anyone can view subscription plans"
  on subscription_plans for select
  using (true);

-- Policies for subscriptions
create policy "Users can view their own subscriptions"
  on subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can create their own subscriptions"
  on subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own subscriptions"
  on subscriptions for update
  using (auth.uid() = user_id);

-- Index for faster lookups
create index if not exists subscriptions_user_id_idx on subscriptions(user_id);
create index if not exists subscriptions_status_idx on subscriptions(status);
create index if not exists subscriptions_end_date_idx on subscriptions(end_date);
