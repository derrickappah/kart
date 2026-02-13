-- Fix wallet_transactions schema to support webhooks and better auditing
alter table wallet_transactions 
add column if not exists reference text unique,
add column if not exists description text;

-- Add index for reference for faster lookups
create index if not exists idx_wallet_transactions_reference on wallet_transactions(reference);
