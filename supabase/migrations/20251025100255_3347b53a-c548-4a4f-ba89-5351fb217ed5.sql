-- Очистка всех данных (записи, клиенты, профили)
-- Сохраняем только структуру таблиц и настройки

-- Удаляем все записи (appointments)
DELETE FROM appointments;

-- Удаляем всех клиентов (clients)
DELETE FROM clients;

-- Удаляем все профили (profiles)
DELETE FROM profiles;

-- Удаляем все платежи (payments)
DELETE FROM payments;