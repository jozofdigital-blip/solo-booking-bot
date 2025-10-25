-- Allow public to read clients with telegram_chat_id for status checking during booking
CREATE POLICY "Public can check telegram status for booking"
ON public.clients
FOR SELECT
TO public, anon, authenticated
USING (telegram_chat_id IS NOT NULL);