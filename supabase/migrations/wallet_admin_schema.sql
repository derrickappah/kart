-- Wallet Admin Access Schema
-- This allows admins to manage wallets for other users (needed for escrow operations)

-- Enable RLS on wallets table if not already enabled
alter table wallets enable row level security;

-- Policy: Admins can view all wallets
create policy "Admins can view all wallets"
  on wallets for select
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and is_admin = true
    )
  );

-- Policy: Admins can insert wallets for any user (needed for escrow release)
create policy "Admins can create wallets for any user"
  on wallets for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and is_admin = true
    )
  );

-- Policy: Admins can update any wallet (needed for escrow release)
create policy "Admins can update any wallet"
  on wallets for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and is_admin = true
    )
  );

-- Policy: Admins can view all wallet transactions
create policy "Admins can view all wallet transactions"
  on wallet_transactions for select
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and is_admin = true
    )
  );

-- Policy: Admins can create wallet transactions for any wallet
create policy "Admins can create wallet transactions"
  on wallet_transactions for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and is_admin = true
    )
  );
