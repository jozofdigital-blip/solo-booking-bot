-- Add telegram_chat_id to clients table
ALTER TABLE public.clients ADD COLUMN telegram_chat_id TEXT;