-- The existing constraint likely doesn't include 'Active' (Title Case)
-- We will drop the constraint and re-add it to allow our values.

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_status_check;

-- Add it back with our expected values
ALTER TABLE products 
ADD CONSTRAINT products_status_check 
CHECK (status IN ('Active', 'Sold', 'Pending', 'active', 'sold', 'pending'));
