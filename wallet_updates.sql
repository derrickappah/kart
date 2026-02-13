-- Add payout details and referral field to profiles
alter table profiles 
add column if not exists bank_account_details jsonb,
add column if not exists momo_details jsonb,
add column if not exists referred_by uuid references auth.users(id);

-- Create referrals tracking table for better auditing
create table if not exists referrals_tracking (
    id uuid default gen_random_uuid() primary key,
    referrer_id uuid references auth.users(id) not null,
    referee_id uuid references auth.users(id) not null,
    status text default 'Pending', -- Pending, Completed (if reward given)
    reward_amount numeric default 5.00,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(referee_id) -- A user can only be referred once
);

-- Enable RLS
alter table referrals_tracking enable row level security;

-- Policies for referrals_tracking
create policy "Users can view their own referrals"
on referrals_tracking for select
using (auth.uid() = referrer_id or auth.uid() = referee_id);

create policy "Admins can view all referrals"
on referrals_tracking for select
using (
    exists (
        select 1 from profiles
        where id = auth.uid()
        and is_admin = true
    )
);
