# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Что это за проект

Backend-сервер для Telegram-бота продажи VPN-подписок. Стек: **Node.js + TypeScript + Express + MongoDB (Mongoose) + grammy (Telegram Bot API)**. Интегрируется с:
- **3x-ui / X-ray** — панель управления VPN-сервером (VLESS + XTLS-Reality)
- **YooKassa** — российский платёжный шлюз
- **Telegram Bot** — отправка конфигов и уведомлений пользователям

## Команды

```bash
npm run dev      # разработка: nodemon + ts-node
npm run build    # компиляция TypeScript → dist/
```

Docker:
```bash
docker build -t vpn-bot-server .
docker run -p 3000:3000 --env-file .env vpn-bot-server
```

## Архитектура

```
src/
├── index.ts              # точка входа: Express + Bot + MongoDB + запуск cron
├── settings.ts           # все переменные окружения через dotenv
├── api/
│   ├── apiXray.ts        # HTTP-вызовы к 3x-ui панели (login, addClient, deleteClient)
│   └── apiYoo.ts         # YooKassa API (createPayment, getPayment)
├── models/               # Mongoose-схемы
│   ├── user-model.ts
│   ├── subscription-model.ts
│   ├── free-subscription-model.ts
│   ├── payment-model.ts
│   └── server-model.ts
├── routes/
│   ├── payment.ts        # POST /payment/create-payment, /free-subscription, /webhook
│   └── subscription.ts   # GET /subscription
├── controllers/
│   ├── payment.ts
│   └── subscription.ts
└── service/
    ├── xray-service.ts   # login (2FA), addClient, deleteClient на X-ray
    ├── payment-service.ts # createPayment, checkPayment, handlePaymentWebhook, paySucceeded
    ├── check-service.ts  # cron-задачи: checkWarningDay, checkStatusSubscribes, checkPaymentOneTime
    └── other-service.ts  # checkServer (выбор сервера), freeSubscription, normalizeWebhook
```

## Основные потоки данных

### Платная подписка
1. Telegram-бот → `POST /payment/create-payment` `{userId, price}` → создаётся запись Payment в MongoDB + ссылка YooKassa
2. Пользователь оплачивает → YooKassa → `POST /payment/webhook`
3. `handlePaymentWebhook` → `paySucceeded(userId, price)`:
   - Если есть активная подписка (free или paid) — продлевает её
   - Иначе — выбирает наименее загруженный сервер (`checkServer`), добавляет клиента в X-ray, создаёт Subscription
   - Отправляет VLESS-конфиг пользователю через Telegram Bot

### Бесплатная подписка
`POST /payment/free-subscription` `{userId}` → `freeSubscription()` → X-ray `addClient` → SubscriptionFree + конфиг в Telegram

### Реферальная система
При `paySucceeded`: если у пользователя есть `inviteId` (числовой) → продлевает подписку пригласившего на `DAY_FOR_INVITE` дней. Если у пригласившего была free-подписка — конвертирует её в обычную.

### Cron-задачи (запускаются в `allFunctionCheck` при старте)
- **каждые 6 часов**: `login()` — обновляет 2FA-cookies для всех X-ray серверов
- **каждую минуту**: `checkWarningDay()` — уведомления за 3 дня и 1 день до истечения; `checkStatusSubscribes()` — деактивирует истёкшие подписки и удаляет клиентов из X-ray
- **при старте**: `checkPaymentOneTime()` — обрабатывает платежи со статусом `pending` (до 3 попыток)

## Модели MongoDB

| Коллекция | Назначение |
|---|---|
| `users` | Telegram-пользователи: `userId`, `inviteId`, `useFreeSub` |
| `subscription` | Платные подписки: `userId`, `uuid`, `config` (VLESS), `statusSub`, `subExpire`, `server` |
| `subscription-free` | Бесплатные триалы (та же структура, другая коллекция) |
| `payment` | Платёжные записи: `paymentId`, `idempotenceKeyClient`, `processed`, TTL 90 дней |
| `server` | X-ray серверы: `baseUrl`, `cookie` (сессия), `quantityUsers`, `publickKey`, `sni`, `sidId`, `flag` (emoji) |

## Переменные окружения (.env)

```
PORT_SERVER=3000
DB_URL=mongodb://localhost:27017/vpn-bot
BOT_TOKEN=...
YM_SHOP_IP=...         # shopId YooKassa
YM_SECRET_KEY=...
FREE_DAY=7             # дней бесплатной подписки
DAY_FOR_INVITE=7       # дней бонуса за реферал
MAX_USERS_ON_SERVER=100
NAME_TG_BOT=...        # username бота (для return_url в платеже)
SUPPORT_NAME=...       # @username поддержки
```

## Формат VLESS-конфига

```
vless://{uuid}@{server.ip}?type=tcp&encryption=none&security=reality
  &pbk={server.publickKey}&fp=random&sni={server.sni}&sid={server.sidId}
  &spx=%2F&flow=xtls-rprx-vision#{encodeURIComponent(server.flag + " " + server.serverName)}
```

Имя конфига (`#...`) берётся из полей сервера: `flag` (emoji) + `serverName`. Пример: `🇩🇪 DE-1`.
Inbound ID в X-ray захардкожен как `1` в `deleteClientApi` и в `addClient`.

## Известные проблемы и ограничения

- **Нет авторизации на endpoints** — любой может дёрнуть `/payment/create-payment`. Предполагается, что сервер доступен только из внутренней сети или только боту.
- **Маппинг цена→дни захардкожен** в `paySucceeded`: `{'170': 30, '480': 90}`. При изменении тарифов нужно менять код.
- **`GET /subscription` возвращает тестовый конфиг** — endpoint ещё не реализован для реальных пользователей.
- **`forEach` с async-коллбэками** в `checkWarningDay` не ждёт завершения каждой операции (параллельно). В `checkStatusSubscribes` исправлено через `for...of` + `simulateAsyncOperation`.
- **Typo в поле модели**: `publickKey` (не `publicKey`) — используется везде, не исправлять без миграции.
- **Cookie-сессии X-ray** хранятся в MongoDB и обновляются каждые 6 часов. При истечении cookie до обновления операции с подписками упадут.
- **TODO в коде**: при новой оплате (если была предыдущая подписка) использовать тот же `uuid`, чтобы конфиг продолжал работать без смены.
