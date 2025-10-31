-- Создание структуры базы данных для Timeweb PostgreSQL
-- Выполните этот скрипт первым

-- Таблица пользователей (заменяет auth.users из Supabase)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица профилей
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  description TEXT,
  telegram_chat_id TEXT,
  unique_slug TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  address TEXT,
  phone TEXT,
  timezone TEXT DEFAULT 'Europe/Moscow',
  notify_24h_before BOOLEAN DEFAULT false,
  notify_1h_before BOOLEAN DEFAULT false,
  trial_end_date TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '10 days'),
  subscription_end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица услуг
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  duration_minutes INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица клиентов
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  notes TEXT,
  telegram_chat_id TEXT,
  last_visit TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица записей
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  highlight_color TEXT,
  cancellation_reason TEXT,
  notification_sent_24h BOOLEAN DEFAULT false,
  notification_sent_1h BOOLEAN DEFAULT false,
  notification_viewed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица рабочих часов
CREATE TABLE IF NOT EXISTS working_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_working BOOLEAN DEFAULT true,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id, day_of_week)
);

-- Таблица платежей
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  payment_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL,
  months INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица промокодов
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_percent INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для оптимизации
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_unique_slug ON profiles(unique_slug);
CREATE INDEX idx_services_profile_id ON services(profile_id);
CREATE INDEX idx_clients_profile_id ON clients(profile_id);
CREATE INDEX idx_appointments_profile_id ON appointments(profile_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_working_hours_profile_id ON working_hours(profile_id);
CREATE INDEX idx_payments_profile_id ON payments(profile_id);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_working_hours_updated_at BEFORE UPDATE ON working_hours
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Функция для генерации уникального slug
CREATE OR REPLACE FUNCTION generate_unique_slug()
RETURNS TEXT AS $$
DECLARE
  new_slug TEXT;
  slug_exists BOOLEAN;
BEGIN
  LOOP
    new_slug := LOWER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 7));
    SELECT EXISTS(SELECT 1 FROM profiles WHERE unique_slug = new_slug) INTO slug_exists;
    IF NOT slug_exists THEN
      RETURN new_slug;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Функция проверки пересечения записей
CREATE OR REPLACE FUNCTION validate_appointment_no_overlap()
RETURNS TRIGGER AS $$
DECLARE
  new_duration INT;
  new_end TIME;
BEGIN
  -- Пропускаем валидацию для отмененных записей
  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  -- Получаем длительность услуги
  SELECT duration_minutes INTO new_duration
  FROM services
  WHERE id = NEW.service_id;

  IF new_duration IS NULL THEN
    RAISE EXCEPTION 'Service duration is not defined';
  END IF;

  -- Вычисляем время окончания
  new_end := NEW.appointment_time + (new_duration || ' minutes')::INTERVAL;

  -- Проверяем пересечения
  IF EXISTS (
    SELECT 1
    FROM appointments a
    JOIN services s ON s.id = a.service_id
    WHERE a.profile_id = NEW.profile_id
      AND a.appointment_date = NEW.appointment_date
      AND a.status <> 'cancelled'
      AND a.id <> NEW.id
      AND NEW.appointment_time < (a.appointment_time + (s.duration_minutes || ' minutes')::INTERVAL)
      AND a.appointment_time < new_end
  ) THEN
    RAISE EXCEPTION 'OVERLAP_TIME_SLOT';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер проверки пересечения записей
CREATE TRIGGER check_appointment_overlap
  BEFORE INSERT OR UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION validate_appointment_no_overlap();
