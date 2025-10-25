
-- Добавляем поле phone в таблицу profiles для контакта мастера
ALTER TABLE public.profiles 
ADD COLUMN phone text;

COMMENT ON COLUMN public.profiles.phone IS 'Контактный телефон мастера для клиентов';
