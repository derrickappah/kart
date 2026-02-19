-- Platform Settings Schema
-- Key-value configuration store for admin-managed platform settings

create table if not exists platform_settings (
  key text primary key,
  value jsonb not null,
  category text not null check (category in ('financial', 'promotion', 'general')),
  label text not null,
  description text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_by uuid references auth.users(id)
);

-- Seed default settings

-- Financial settings
insert into platform_settings (key, value, category, label, description) values
  ('transaction_fee_percent', '5', 'financial', 'Transaction Fee (%)', 'Percentage fee charged on each sale'),
  ('withdrawal_fee_flat', '2', 'financial', 'Withdrawal Fee (GH₵)', 'Flat fee deducted from each withdrawal'),
  ('min_withdrawal_amount', '10', 'financial', 'Minimum Withdrawal (GH₵)', 'Minimum amount a user can withdraw'),
  ('min_deposit_amount', '1', 'financial', 'Minimum Deposit (GH₵)', 'Minimum wallet deposit amount'),
  ('marketplace_service_fee', '1.50', 'financial', 'Marketplace Service Fee (GH₵)', 'Flat fee charged to buyers on every marketplace purchase')
on conflict (key) do nothing;

-- Promotion pricing
insert into platform_settings (key, value, category, label, description) values
  ('promo_daily_price', '5', 'promotion', 'Daily Boost Price (GH₵)', 'Cost for a 24-hour listing boost'),
  ('promo_weekly_price', '25', 'promotion', 'Weekly Boost Price (GH₵)', 'Cost for a 7-day listing boost'),
  ('promo_featured_price', '50', 'promotion', 'Featured Listing Price (GH₵)', 'Cost for permanent featured badge')
on conflict (key) do nothing;

-- General settings
insert into platform_settings (key, value, category, label, description) values
  ('referral_reward_amount', '5', 'general', 'Referral Reward (GH₵)', 'Amount credited for successful referrals'),
  ('maintenance_mode', 'false', 'general', 'Maintenance Mode', 'When enabled, the platform shows a maintenance page'),
  ('platform_support_email', '"support@kart.com"', 'general', 'Support Email', 'Contact email shown to users'),
  ('max_listing_price', '50000', 'general', 'Max Listing Price (GH₵)', 'Maximum price allowed for a product listing')
on conflict (key) do nothing;

-- Enable RLS
alter table platform_settings enable row level security;

-- Everyone can read settings (needed for dynamic pricing on frontend)
create policy "Anyone can read platform settings"
  on platform_settings for select
  using (true);

-- Only admins can update settings
create policy "Admins can update platform settings"
  on platform_settings for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

-- Only admins can insert new settings
create policy "Admins can insert platform settings"
  on platform_settings for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

-- Index for fast category lookups
create index if not exists platform_settings_category_idx on platform_settings(category);
