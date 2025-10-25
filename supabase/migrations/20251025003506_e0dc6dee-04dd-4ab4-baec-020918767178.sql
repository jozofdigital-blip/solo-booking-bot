-- Remove default values for notification settings
ALTER TABLE public.profiles 
  ALTER COLUMN notify_24h_before SET DEFAULT false,
  ALTER COLUMN notify_1h_before SET DEFAULT false;

-- Update existing profiles to have notifications disabled by default
UPDATE public.profiles 
SET 
  notify_24h_before = false,
  notify_1h_before = false
WHERE 
  notify_24h_before = true 
  AND notify_1h_before = false;