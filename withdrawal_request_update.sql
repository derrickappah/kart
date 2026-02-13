-- Add payout_details snapshot to withdrawal_requests
alter table withdrawal_requests 
add column if not exists payout_details jsonb;
