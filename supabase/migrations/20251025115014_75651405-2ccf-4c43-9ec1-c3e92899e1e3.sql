-- Add timezone field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN timezone TEXT DEFAULT 'Europe/Moscow';