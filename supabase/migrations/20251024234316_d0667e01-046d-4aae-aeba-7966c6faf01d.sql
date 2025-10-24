-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the reminder check to run every hour
SELECT cron.schedule(
  'check-appointment-reminders',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://umluahqqpoimkbidndll.supabase.co/functions/v1/send-appointment-reminders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtbHVhaHFxcG9pbWtiaWRuZGxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3ODc0OTYsImV4cCI6MjA3NjM2MzQ5Nn0.jiitKtDL0iYt6Q5qt5OlbIFH2KSkmbRXjlGbVDqIKNA"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

COMMENT ON EXTENSION pg_cron IS 'Cron-based job scheduler for PostgreSQL';
COMMENT ON EXTENSION pg_net IS 'Async HTTP requests from PostgreSQL';