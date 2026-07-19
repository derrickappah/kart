-- Create push subscriptions table
create table if not exists push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  endpoint text unique not null,
  keys jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table push_subscriptions enable row level security;

-- Policies for push subscriptions
create policy "Users can manage their own push subscriptions"
  on push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Add platform setting for API base URL
insert into platform_settings (key, value, category, label, description) values
  ('api_base_url', '"https://kart-murex.vercel.app"', 'general', 'API Base URL', 'Base URL of the API server for webhooks and notification delivery')
on conflict (key) do nothing;

-- Create extension if not exists
create extension if not exists pg_net;

-- Function to trigger push notification webhook
create or replace function notify_push_service_on_insert()
returns trigger as $$
declare
  api_url text;
  payload jsonb;
begin
  -- Resolve API base URL from platform_settings
  select value#>>'{}' into api_url
  from platform_settings
  where key = 'api_base_url';

  if api_url is null then
    api_url := 'https://kart-murex.vercel.app';
  end if;

  -- Build payload
  payload := jsonb_build_object(
    'id', new.id,
    'user_id', new.user_id,
    'type', new.type,
    'title', new.title,
    'message', new.message,
    'related_order_id', new.related_order_id,
    'created_at', new.created_at
  );

  -- Perform HTTP POST asynchronously using pg_net (ignoring errors to prevent transaction rollback)
  begin
    perform net.http_post(
      url := api_url || '/api/notifications/send-push',
      body := payload::text,
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  exception when others then
    -- Fail-safe: do not fail the parent transaction if HTTP POST fails
  end;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger to fire on notifications insert
drop trigger if exists on_notification_created on notifications;
create trigger on_notification_created
after insert on notifications
for each row execute function notify_push_service_on_insert();
