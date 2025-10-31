# Инструкция по переносу базы данных на Timeweb

## Шаг 1: Создание базы данных на Timeweb

1. Войдите в панель управления Timeweb
2. Перейдите в раздел "Базы данных"
3. Создайте новую PostgreSQL базу данных
4. Сохраните учетные данные:
   - Хост (например: `pg-xxxxx.timeweb.cloud`)
   - Порт (обычно `5432`)
   - Имя базы данных
   - Пользователь
   - Пароль

## Шаг 2: Выполнение миграции структуры

### Вариант А: Через панель Timeweb (если есть phpPgAdmin или аналог)
1. Откройте phpPgAdmin в панели Timeweb
2. Выберите вашу базу данных
3. Перейдите в SQL-редактор
4. Скопируйте содержимое файла `01-create-schema.sql`
5. Вставьте и выполните скрипт

### Вариант Б: Через psql в терминале
```bash
# Подключение к базе данных
psql -h pg-xxxxx.timeweb.cloud -U your_username -d your_database

# Выполнение скрипта
\i 01-create-schema.sql
```

### Вариант В: Через pgAdmin
1. Установите pgAdmin (если еще не установлен)
2. Создайте новое подключение к Timeweb базе данных
3. Откройте Query Tool
4. Загрузите файл `01-create-schema.sql`
5. Выполните скрипт

## Шаг 3: Подготовка данных для импорта

1. Откройте файл `02-import-data.sql`
2. Заполните реальные данные из JSON файлов в папке `data-export/2025-10-27T07-34-10/`:
   - `public.profiles.json` - данные профилей
   - `public.clients.json` - клиенты (уже добавлены)
   - `public.services.json` - услуги
   - `public.appointments.json` - записи
   - `public.working_hours.json` - рабочие часы
   - `public.payments.json` - платежи

3. **ВАЖНО**: Создайте реальных пользователей с хешированными паролями:
   ```sql
   -- Используйте bcrypt для хеширования паролей
   -- Онлайн: https://bcrypt-generator.com/
   INSERT INTO users (id, email, password_hash) VALUES
   ('user-id-from-profiles', 'email@example.com', '$2a$10$...');
   ```

## Шаг 4: Импорт данных

1. Откройте `02-import-data.sql` в редакторе SQL (как в Шаге 2)
2. Выполните скрипт для импорта данных

## Шаг 5: Настройка API сервера на Timeweb

Теперь нужно создать Node.js API сервер, который будет работать с этой базой данных.

### Пример структуры проекта на Timeweb:

```
/looktime-api/
├── package.json
├── server.js
├── .env
└── routes/
    ├── auth.js
    ├── profiles.js
    ├── services.js
    ├── appointments.js
    └── clients.js
```

### Минимальный package.json:
```json
{
  "name": "looktime-api",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "cors": "^2.8.5",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "dotenv": "^16.3.1"
  }
}
```

### Файл .env:
```
DATABASE_URL=postgresql://username:password@pg-xxxxx.timeweb.cloud:5432/database_name
JWT_SECRET=your_random_secret_key_here
PORT=3000
```

### Базовый server.js:
```javascript
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(cors());
app.use(express.json());

// Импортируйте роуты
// const authRoutes = require('./routes/auth');
// app.use('/auth', authRoutes);

app.listen(process.env.PORT || 3000, () => {
  console.log('API server running on port', process.env.PORT || 3000);
});
```

## Шаг 6: Развертывание API на Timeweb

1. Загрузите код API на сервер Timeweb (через FTP или Git)
2. Установите Node.js на сервере (если еще не установлен)
3. Установите зависимости: `npm install`
4. Запустите сервер: `npm start`
5. Настройте PM2 для автозапуска:
   ```bash
   npm install -g pm2
   pm2 start server.js --name looktime-api
   pm2 save
   pm2 startup
   ```

## Шаг 7: Проверка

1. Проверьте, что API доступен по адресу `https://api.looktime.pro`
2. Протестируйте основные endpoints:
   - GET `/auth/user` - получение текущего пользователя
   - POST `/auth/signin` - авторизация
   - GET `/services?profile_id=xxx` - получение услуг

## Возможные проблемы

1. **Ошибка подключения к БД**: Проверьте firewall и разрешите подключения к PostgreSQL
2. **SSL errors**: Добавьте `ssl: { rejectUnauthorized: false }` в настройки Pool
3. **CORS errors**: Убедитесь, что CORS настроен правильно в Express

## Дополнительная информация

- Документация PostgreSQL: https://www.postgresql.org/docs/
- Документация Express: https://expressjs.com/
- Документация node-postgres: https://node-postgres.com/

---

После выполнения всех шагов ваше приложение на Lovable будет подключено к базе данных на Timeweb через API сервер на `https://api.looktime.pro`.
