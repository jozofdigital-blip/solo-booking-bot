-- Drop the existing restrictive insert policy
DROP POLICY IF EXISTS "Anyone can create appointments" ON public.appointments;

-- Create a new permissive insert policy that allows both authenticated and anonymous users
CREATE POLICY "Anyone can create appointments"
ON public.appointments
FOR INSERT
TO public, anon, authenticated
WITH CHECK (true);