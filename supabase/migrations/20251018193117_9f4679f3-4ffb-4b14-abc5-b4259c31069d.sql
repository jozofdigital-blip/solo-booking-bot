-- Add duration_minutes column to services if not exists (for backward compatibility)
-- Create working hours table
CREATE TABLE IF NOT EXISTS public.working_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_working BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, day_of_week)
);

-- Enable RLS
ALTER TABLE public.working_hours ENABLE ROW LEVEL SECURITY;

-- RLS Policies for working_hours
CREATE POLICY "Profile owners can manage their working hours"
ON public.working_hours
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = working_hours.profile_id
  AND profiles.user_id = auth.uid()
));

CREATE POLICY "Public can view working hours"
ON public.working_hours
FOR SELECT
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_working_hours_updated_at
BEFORE UPDATE ON public.working_hours
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();