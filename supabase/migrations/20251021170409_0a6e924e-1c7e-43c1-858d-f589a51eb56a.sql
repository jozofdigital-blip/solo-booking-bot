-- Add DELETE policy for appointments
CREATE POLICY "Profile owners can delete their appointments"
ON appointments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = appointments.profile_id
    AND profiles.user_id = auth.uid()
  )
);