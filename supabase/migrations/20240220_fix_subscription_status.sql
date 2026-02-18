-- Drop the existing constraint if it exists
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;

-- Add the corrected constraint including 'Cancelled'
ALTER TABLE subscriptions 
ADD CONSTRAINT subscriptions_status_check 
CHECK (status IN ('Active', 'Expired', 'Cancelled', 'Pending'));

-- Fix any existing bad data if necessary (though likely none exist)
UPDATE subscriptions SET status = 'Cancelled' WHERE status = 'Failed';
