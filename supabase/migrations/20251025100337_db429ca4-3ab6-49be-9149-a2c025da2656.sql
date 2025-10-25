-- Оптимизация базы данных для быстрой работы на мобильном

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_appointments_profile_date 
  ON appointments(profile_id, appointment_date);

CREATE INDEX IF NOT EXISTS idx_appointments_profile_status 
  ON appointments(profile_id, status);

CREATE INDEX IF NOT EXISTS idx_clients_profile_phone 
  ON clients(profile_id, phone);

CREATE INDEX IF NOT EXISTS idx_services_profile_active 
  ON services(profile_id, is_active);

CREATE INDEX IF NOT EXISTS idx_working_hours_profile 
  ON working_hours(profile_id, day_of_week);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id 
  ON profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_profiles_unique_slug 
  ON profiles(unique_slug);

-- Оптимизация для realtime подписок
CREATE INDEX IF NOT EXISTS idx_appointments_created_at 
  ON appointments(profile_id, created_at DESC);