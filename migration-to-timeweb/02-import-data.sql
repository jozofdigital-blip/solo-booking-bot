-- Импорт данных из Supabase в Timeweb
-- ВАЖНО: Замените значения ниже на реальные данные из data-export/

-- 1. Импорт промокодов
INSERT INTO promo_codes (id, code, discount_percent, is_active, created_at) VALUES
('7d8bf7ab-338a-423b-9dc9-aefd7297bcd7', 'Промо10', 10, true, '2025-10-24T23:28:49.328313Z'),
('0945ce83-4fe9-44d3-b2f8-d5b16334330b', 'Лук20', 20, true, '2025-10-24T23:28:49.328313Z'),
('e2e591c9-51e6-4f28-b470-32c3efb83689', 'Макси50', 50, true, '2025-10-24T23:28:49.328313Z'),
('b9d1e06a-fafb-4209-a5f7-f7c2fec01092', 'Отдуши100', 100, true, '2025-10-24T23:28:49.328313Z')
ON CONFLICT (id) DO NOTHING;

-- 2. Создание тестового пользователя (user_id из profiles)
-- ВАЖНО: Замените на реальный user_id из вашего Supabase
INSERT INTO users (id, email, password_hash, created_at) VALUES
('1f3da404-27d5-482d-ad84-40591bd38014', 'user@looktime.pro', '$2a$10$dummy_hash_replace_with_real', NOW())
ON CONFLICT (id) DO NOTHING;

-- 3. Импорт профиля (один профиль из data-export/2025-10-27T07-34-10/public.profiles.json)
INSERT INTO profiles (
  id, user_id, business_name, telegram_chat_id, unique_slug, avatar_url, 
  address, phone, timezone, notify_24h_before, notify_1h_before, 
  trial_end_date, subscription_end_date, created_at, updated_at
) VALUES (
  '1f3da404-27d5-482d-ad84-40591bd38014',
  '1f3da404-27d5-482d-ad84-40591bd38014',
  'Имя из profiles.json',  -- Замените на реальное значение
  'telegram_chat_id из profiles.json',  -- Замените на реальное значение
  'unique_slug из profiles.json',  -- Замените на реальное значение
  NULL,
  NULL,
  NULL,
  'Europe/Moscow',
  false,
  false,
  NOW() + INTERVAL '10 days',
  NULL,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 4. Импорт клиентов (из data-export/2025-10-27T07-34-10/public.clients.json)
INSERT INTO clients (id, profile_id, name, phone, notes, telegram_chat_id, last_visit, created_at, updated_at) VALUES
('7b041ee2-e5a8-403d-8a68-157c89f9c4e0', '1f3da404-27d5-482d-ad84-40591bd38014', 'Оля', '+79956250718', 'Она такая, конеш, интересная', '982851701', '2025-10-25T13:01:58.228Z', '2025-10-25T13:01:57.440461Z', '2025-10-25T18:04:07.989534Z'),
('86ed4921-d261-4f58-ae13-ec3d1903dfe4', '1f3da404-27d5-482d-ad84-40591bd38014', 'Роман', '+79956072441', 'Вы можете добавить заметку к клиенту, которая видна только вам.', '7442748457', '2025-10-25T18:24:45.126Z', '2025-10-25T18:24:45.78331Z', '2025-10-26T07:07:19.51243Z'),
('c2854494-2565-491a-8a32-824c5df2312c', '1f3da404-27d5-482d-ad84-40591bd38014', 'Вика', '+79999854845', 'Всегда опаздывает', NULL, NULL, '2025-10-26T07:53:07.959085Z', '2025-10-26T07:53:07.959085Z'),
('b00088e4-a0c5-4794-9e76-55006bea3a71', '1f3da404-27d5-482d-ad84-40591bd38014', 'николай', '+79222120050', NULL, NULL, '2025-10-26T16:58:09.591Z', '2025-10-26T16:58:11.241018Z', '2025-10-26T16:58:11.241018Z')
ON CONFLICT (id) DO NOTHING;

-- 5. Импорт услуг (нужно добавить из data-export если есть файл public.services.json)
-- INSERT INTO services (id, profile_id, name, description, price, duration_minutes, is_active, created_at, updated_at) VALUES
-- (...);

-- 6. Импорт записей (из data-export/2025-10-27T07-34-10/public.appointments.json)
-- INSERT INTO appointments (...) VALUES (...);

-- 7. Импорт рабочих часов (нужно добавить из data-export если есть файл public.working_hours.json)
-- INSERT INTO working_hours (...) VALUES (...);

-- 8. Импорт платежей (из data-export/2025-10-27T07-34-10/public.payments.json)
-- INSERT INTO payments (...) VALUES (...);

-- Примечание: Замените значения выше на реальные данные из ваших JSON файлов
-- в папке data-export/2025-10-27T07-34-10/
