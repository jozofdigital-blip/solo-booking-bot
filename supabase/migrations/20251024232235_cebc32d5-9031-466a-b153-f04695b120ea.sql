-- Add notes column to clients table for owner's private notes
ALTER TABLE public.clients
ADD COLUMN notes TEXT;

COMMENT ON COLUMN public.clients.notes IS 'Private notes visible only to the business owner';