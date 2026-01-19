-- Manual Withdrawal Tracking Schema
-- Adds fields to support manual processing of withdrawals when Paystack fails

-- Add manual processing fields to withdrawal_requests table
alter table withdrawal_requests 
add column if not exists processing_method text check (processing_method in ('paystack', 'manual')),
add column if not exists manual_reference text,
add column if not exists manual_transaction_id text,
add column if not exists manual_receipt_url text,
add column if not exists manual_notes text,
add column if not exists paystack_retry_count integer default 0;

-- Add index for filtering by processing method
create index if not exists withdrawal_requests_processing_method_idx on withdrawal_requests(processing_method);

-- Add index for filtering by retry count
create index if not exists withdrawal_requests_retry_count_idx on withdrawal_requests(paystack_retry_count);
