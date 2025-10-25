-- Add 'blocked' status to the valid_status check constraint
ALTER TABLE appointments 
DROP CONSTRAINT IF EXISTS valid_status;

ALTER TABLE appointments 
ADD CONSTRAINT valid_status 
CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'blocked'));