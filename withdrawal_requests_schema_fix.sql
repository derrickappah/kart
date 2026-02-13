-- Add missing columns to withdrawal_requests table
ALTER TABLE withdrawal_requests 
ADD COLUMN IF NOT EXISTS payout_method TEXT DEFAULT 'bank',
ADD COLUMN IF NOT EXISTS payout_details JSONB DEFAULT '{}'::jsonb;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status 
ON withdrawal_requests(status);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id 
ON withdrawal_requests(user_id);
