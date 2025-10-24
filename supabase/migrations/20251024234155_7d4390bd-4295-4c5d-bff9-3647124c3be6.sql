-- Add notification tracking fields to appointments
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS notification_sent_1h BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_sent_24h BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.appointments.notification_sent_1h IS 'Whether 1-hour reminder was sent';
COMMENT ON COLUMN public.appointments.notification_sent_24h IS 'Whether 24-hour reminder was sent';