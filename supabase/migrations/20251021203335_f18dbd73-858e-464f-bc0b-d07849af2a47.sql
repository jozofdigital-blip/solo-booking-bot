-- Add notification timing preferences to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notify_24h_before BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_1h_before BOOLEAN DEFAULT false;