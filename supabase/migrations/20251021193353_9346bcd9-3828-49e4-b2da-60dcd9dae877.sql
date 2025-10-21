-- Add cancellation_reason field to appointments table
ALTER TABLE public.appointments 
ADD COLUMN cancellation_reason TEXT;