-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant permissions to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Create cron job to send appointment reminders every 10 minutes
SELECT cron.schedule(
  'send-appointment-reminders-every-10-min',
  '*/10 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://umluahqqpoimkbidndll.supabase.co/functions/v1/send-appointment-reminders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtbHVhaHFxcG9pbWtiaWRuZGxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3ODc0OTYsImV4cCI6MjA3NjM2MzQ5Nn0.jiitKtDL0iYt6Q5qt5OlbIFH2KSkmbRXjlGbVDqIKNA"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);