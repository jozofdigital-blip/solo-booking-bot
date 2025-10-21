-- Add fields for tracking notification views
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS notification_viewed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS highlight_color TEXT DEFAULT NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_appointments_notification_viewed 
ON appointments(notification_viewed) 
WHERE notification_viewed = false;