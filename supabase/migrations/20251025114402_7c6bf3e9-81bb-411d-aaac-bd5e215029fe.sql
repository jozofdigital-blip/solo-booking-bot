-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Anyone can create appointments" ON public.appointments;

-- Create new permissive policy for public appointment creation
CREATE POLICY "Anyone can create appointments"
ON public.appointments
FOR INSERT
TO public
WITH CHECK (true);