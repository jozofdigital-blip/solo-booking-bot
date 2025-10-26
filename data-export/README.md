# Supabase Data Export

Этот каталог предназначен для резервных копий данных Supabase.

## Как выгрузить данные

1. Убедитесь, что у вас есть сервисный ключ Supabase (Service Role key) и URL проекта.
2. Создайте файл `.env.local` в корне проекта или экспортируйте переменные окружения:
   ```bash
   export SUPABASE_SERVICE_ROLE_KEY="<ваш_service_role_key>"
   export SUPABASE_URL="https://umluahqqpoimkbidndll.supabase.co"
   # Необязательно: изменить размер страницы
   # export SUPABASE_EXPORT_PAGE_SIZE=1000
   ```
3. Запустите команду:
   ```bash
   npm run export:supabase
   ```
4. Скрипт создаст новую папку внутри `data-export/` с временной меткой. Внутри будут:
   - JSON-файл для каждой таблицы (`<schema>.<table>.json`)
   - CSV-файл для каждой таблицы (`<schema>.<table>.csv`)
   - `summary.json` c перечнем выгруженных таблиц и количеством строк.

Файлы из этой папки можно коммитить в репозиторий или передавать в новую базу данных (например, Directus на Timeweb).

## Примечания

- Скрипт использует REST API Supabase, поэтому подключение происходит без прямого доступа к Postgres.
- Service Role key имеет полный доступ к данным. Храните его в безопасном месте и не добавляйте в git.
- Для больших таблиц можно увеличить `SUPABASE_EXPORT_PAGE_SIZE`, чтобы сократить количество запросов.
