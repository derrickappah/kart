-- Migration: Unified Push Subscriptions & Device Tokens
-- Supports Web Push (VAPID) and Mobile App (Capacitor FCM / APNs)

create table if not exists push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  token_type text not null default 'web' check (token_type in ('web', 'fcm')),
  platform text not null default 'web' check (platform in ('web', 'android', 'ios')),
  token text not null,
  subscription_data jsonb default '{}'::jsonb,
  device_info jsonb default '{}'::jsonb,
  is_active boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint push_subscriptions_user_token_unique unique (user_id, token)
);

-- Indexes for performance
create index if not exists idx_push_subs_user_active on push_subscriptions(user_id, is_active);
create index if not exists idx_push_subs_token on push_subscriptions(token);

-- Enable Row Level Security (RLS)
alter table push_subscriptions enable row level security;

-- Policies for push subscriptions
drop policy if exists "Users can manage their own push subscriptions" on push_subscriptions;
create policy "Users can manage their own push subscriptions"
  on push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Optional updated_at trigger
create or replace function update_push_subscription_timestamp()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_push_subscription_timestamp on push_subscriptions;
create trigger set_push_subscription_timestamp
before update on push_subscriptions
for each row execute function update_push_subscription_timestamp();

-- Ensure platform_settings has api_base_url
insert into platform_settings (key, value, category, label, description)
values ('api_base_url', '"https://kart-murex.vercel.app"', 'general', 'API Base URL', 'Base URL of the API server for webhooks and notification delivery')
on conflict (key) do nothing;
