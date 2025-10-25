-- Clear Telegram notification connections globally
UPDATE public.profiles
SET telegram_chat_id = NULL,
    notify_24h_before = false,
    notify_1h_before = false;

UPDATE public.clients
SET telegram_chat_id = NULL;
