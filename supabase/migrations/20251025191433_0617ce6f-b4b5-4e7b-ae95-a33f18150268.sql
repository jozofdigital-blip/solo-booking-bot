-- Добавляем индексы для оптимизации запросов по датам и profile_id
-- Эти индексы значительно ускорят выборку занятых слотов и дней

-- Композитный индекс для быстрой выборки записей по профилю и дате
CREATE INDEX IF NOT EXISTS idx_appointments_profile_date 
ON appointments(profile_id, appointment_date) 
WHERE status != 'cancelled';

-- Индекс для быстрой выборки по диапазону дат
CREATE INDEX IF NOT EXISTS idx_appointments_date_range 
ON appointments(appointment_date, profile_id) 
WHERE status != 'cancelled';

-- Индекс для быстрой выборки активных записей
CREATE INDEX IF NOT EXISTS idx_appointments_active 
ON appointments(profile_id, status, appointment_date)
WHERE status IN ('pending', 'confirmed', 'blocked');

-- Индекс для services (часто используется в JOIN)
CREATE INDEX IF NOT EXISTS idx_services_profile_active 
ON services(profile_id, is_active) 
WHERE is_active = true;