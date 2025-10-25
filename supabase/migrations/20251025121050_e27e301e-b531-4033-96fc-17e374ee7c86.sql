-- Drop existing restrictive insert policy on clients if it exists
DROP POLICY IF EXISTS "Profile owners can manage their clients" ON public.clients;

-- Allow public bookings to create client records
CREATE POLICY "Anyone can create clients"
ON public.clients
FOR INSERT
TO public, anon, authenticated
WITH CHECK (true);

-- Profile owners can still view, update, and delete their clients
CREATE POLICY "Profile owners can view their clients"
ON public.clients
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = clients.profile_id
  AND profiles.user_id = auth.uid()
));

CREATE POLICY "Profile owners can update their clients"
ON public.clients
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = clients.profile_id
  AND profiles.user_id = auth.uid()
));

CREATE POLICY "Profile owners can delete their clients"
ON public.clients
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = clients.profile_id
  AND profiles.user_id = auth.uid()
));