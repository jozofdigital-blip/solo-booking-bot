# Настройка интеграций на Timeweb

## 1. Секреты (Environment Variables)

На вашем Timeweb сервере нужно создать файл `.env` со следующими переменными:

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Telegram Bots
TELEGRAM_BOT_TOKEN=ваш_токен_основного_бота
TELEGRAM_CLIENT_BOT_TOKEN=ваш_токен_клиентского_бота
TELEGRAM_BOT_TOKENS=["токен1","токен2"]

# YooKassa
YOOKASSA_SHOP_ID=ваш_shop_id
YOOKASSA_SECRET_KEY=ваш_secret_key

# JWT для авторизации
JWT_SECRET=ваш_случайный_секрет_минимум_32_символа

# URL вашего API
API_URL=https://api.looktime.pro
FRONTEND_URL=https://looktime.pro
```

### Где взять текущие значения:

Ваши текущие секреты уже настроены в проекте. Вам нужно их скопировать:
- **TELEGRAM_BOT_TOKEN** - токен основного бота для владельцев
- **TELEGRAM_CLIENT_BOT_TOKEN** - токен клиентского бота
- **YOOKASSA_SHOP_ID** - ID магазина в ЮКасса
- **YOOKASSA_SECRET_KEY** - секретный ключ ЮКасса

## 2. Настройка вебхуков YooKassa

После развертывания API на Timeweb, настройте вебхук в личном кабинете ЮКасса:

1. Зайдите в личный кабинет ЮКасса: https://yookassa.ru/my
2. Перейдите в раздел "Настройки" → "Уведомления"
3. Установите HTTP-уведомления на URL:
   ```
   https://api.looktime.pro/webhooks/yookassa
   ```
4. Выберите события для уведомлений:
   - `payment.succeeded` - успешная оплата
   - `refund.succeeded` - успешный возврат

## 3. Настройка вебхуков Telegram

### 3.1 Основной бот (для владельцев)

Выполните POST запрос:
```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.looktime.pro/webhooks/telegram/owner",
    "allowed_updates": ["message", "callback_query", "my_chat_member", "chat_member"],
    "drop_pending_updates": false
  }'
```

### 3.2 Клиентский бот

Выполните POST запрос:
```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_CLIENT_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.looktime.pro/webhooks/telegram/client",
    "allowed_updates": ["message", "callback_query", "my_chat_member", "chat_member"],
    "drop_pending_updates": false
  }'
```

### 3.3 Проверка настройки вебхуков

```bash
# Для основного бота
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"

# Для клиентского бота
curl "https://api.telegram.org/bot<TELEGRAM_CLIENT_BOT_TOKEN>/getWebhookInfo"
```

## 4. API Endpoints для интеграций

Ваш API сервер должен реализовать следующие эндпоинты:

### 4.1 YooKassa вебхук
```
POST /webhooks/yookassa
```
Обрабатывает уведомления от ЮКасса о статусе платежей.

### 4.2 Telegram вебхуки
```
POST /webhooks/telegram/owner
POST /webhooks/telegram/client
```
Обрабатывают сообщения от Telegram ботов.

### 4.3 Создание платежа
```
POST /api/payments/create
```
Создает платеж в ЮКасса и возвращает ссылку для оплаты.

### 4.4 Telegram уведомления
```
POST /api/telegram/notify
POST /api/telegram/notify-client
```
Отправляет уведомления владельцам и клиентам через Telegram.

### 4.5 Автоматические напоминания
Настройте cron job для отправки напоминаний:
```bash
# В crontab добавьте:
*/15 * * * * curl -X POST https://api.looktime.pro/api/cron/send-reminders
```

## 5. Структура API сервера для интеграций

Добавьте в ваш `server.js` следующие маршруты:

```javascript
// Вебхук YooKassa
app.post('/webhooks/yookassa', async (req, res) => {
  const notification = req.body;
  
  if (notification.event === 'payment.succeeded') {
    const { object } = notification;
    const paymentId = object.metadata.payment_id;
    const profileId = object.metadata.profile_id;
    const months = parseInt(object.metadata.months);
    
    // Обновить статус платежа
    await db.query(
      'UPDATE payments SET status = $1, updated_at = NOW() WHERE id = $2',
      ['succeeded', paymentId]
    );
    
    // Продлить подписку
    const { rows } = await db.query(
      'SELECT subscription_end_date FROM profiles WHERE id = $1',
      [profileId]
    );
    
    let newEndDate;
    if (rows[0].subscription_end_date && new Date(rows[0].subscription_end_date) > new Date()) {
      newEndDate = new Date(rows[0].subscription_end_date);
      newEndDate.setMonth(newEndDate.getMonth() + months);
    } else {
      newEndDate = new Date();
      newEndDate.setMonth(newEndDate.getMonth() + months);
    }
    
    await db.query(
      'UPDATE profiles SET subscription_end_date = $1, updated_at = NOW() WHERE id = $2',
      [newEndDate, profileId]
    );
  }
  
  if (notification.event === 'refund.succeeded') {
    const { object } = notification;
    const paymentId = object.payment_id;
    
    const { rows } = await db.query(
      'SELECT profile_id FROM payments WHERE yookassa_payment_id = $1',
      [paymentId]
    );
    
    if (rows.length > 0) {
      await db.query(
        'UPDATE payments SET status = $1, updated_at = NOW() WHERE yookassa_payment_id = $2',
        ['refunded', paymentId]
      );
      
      await db.query(
        'UPDATE profiles SET subscription_end_date = NULL, updated_at = NOW() WHERE id = $1',
        [rows[0].profile_id]
      );
    }
  }
  
  res.json({ success: true });
});

// Вебхуки Telegram
app.post('/webhooks/telegram/:botType', async (req, res) => {
  const { botType } = req.params; // 'owner' или 'client'
  const update = req.body;
  
  // Здесь реализуйте логику обработки Telegram сообщений
  // Можете использовать код из текущих Edge Functions как референс
  
  res.json({ ok: true });
});

// Создание платежа
app.post('/api/payments/create', authenticateToken, async (req, res) => {
  const { planId, amount, description, months } = req.body;
  const profileId = req.user.profile_id;
  
  const YooKassa = require('yookassa');
  const yookassa = new YooKassa({
    shopId: process.env.YOOKASSA_SHOP_ID,
    secretKey: process.env.YOOKASSA_SECRET_KEY
  });
  
  const { rows } = await db.query(
    'INSERT INTO payments (profile_id, plan_id, amount, status) VALUES ($1, $2, $3, $4) RETURNING id',
    [profileId, planId, amount, 'pending']
  );
  
  const paymentId = rows[0].id;
  
  const payment = await yookassa.createPayment({
    amount: {
      value: amount.toString(),
      currency: 'RUB'
    },
    confirmation: {
      type: 'redirect',
      return_url: `${process.env.FRONTEND_URL}/payment-result`
    },
    description,
    metadata: {
      payment_id: paymentId,
      profile_id: profileId,
      months: months.toString()
    }
  });
  
  await db.query(
    'UPDATE payments SET yookassa_payment_id = $1 WHERE id = $2',
    [payment.id, paymentId]
  );
  
  res.json({ confirmation_url: payment.confirmation.confirmation_url });
});
```

## 6. Установка необходимых npm пакетов

```bash
npm install yookassa node-telegram-bot-api node-cron
```

## 7. Тестирование интеграций

### 7.1 Тест YooKassa вебхука (локально)
```bash
curl -X POST http://localhost:3000/webhooks/yookassa \
  -H "Content-Type: application/json" \
  -d '{
    "event": "payment.succeeded",
    "object": {
      "id": "test_payment_id",
      "status": "succeeded",
      "metadata": {
        "payment_id": "uuid",
        "profile_id": "uuid",
        "months": "1"
      }
    }
  }'
```

### 7.2 Тест Telegram вебхука
Отправьте сообщение боту и проверьте логи сервера.

## 8. Мониторинг

Настройте логирование для отслеживания:
- Входящих вебхуков от YooKassa
- Сообщений от Telegram ботов
- Ошибок при отправке уведомлений
- Статусов платежей

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

## 9. Безопасность

1. **Проверяйте подписи вебхуков YooKassa**
2. **Используйте HTTPS для всех вебхуков**
3. **Не храните секретные ключи в репозитории**
4. **Настройте rate limiting для вебхуков**
5. **Валидируйте все входящие данные**

## 10. Чеклист переноса

- [ ] Скопировать все секреты в `.env` на Timeweb
- [ ] Настроить вебхук YooKassa
- [ ] Настроить вебхуки Telegram (оба бота)
- [ ] Проверить вебхуки через `getWebhookInfo`
- [ ] Реализовать эндпоинты вебхуков в API
- [ ] Настроить cron для напоминаний
- [ ] Протестировать создание платежа
- [ ] Протестировать отправку уведомлений
- [ ] Настроить мониторинг и логирование
- [ ] Проверить работу на продакшене
