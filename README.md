# StreamRush — Telegram Mini App

Краш-игровая платформа с 3 играми, магазином звёзд и реферальной системой.

## Деплой на Railway

### 1. Создай PostgreSQL-базу в Railway
В дашборде Railway → New → Database → Add PostgreSQL

Railway автоматически выставит DATABASE_URL в переменных окружения.

### 2. Выставь переменные окружения

В настройках сервиса → Variables:

| Переменная | Значение |
|---|---|
| TELEGRAM_BOT_TOKEN | Токен от @BotFather |
| APP_DOMAIN | Railway домен (напр. streamrush.up.railway.app) |
| DATABASE_URL | Добавится автоматически |

PORT Railway выставляет сам — не трогай.

### 3. Загрузи код в GitHub и подключи к Railway

В Railway → New → GitHub Repo → выбери репозиторий.

Railway сам запустит:
- pnpm install
- pnpm run db:push (создаст таблицы)
- pnpm run build (соберёт фронтенд + бекенд)
- pnpm run start (запустит Express)

### 4. Настрой Telegram бота

После деплоя бот сам выставит вебхук и команды.
Не забудь через @BotFather добавить кнопку Menu Button с URL твоего приложения.

## Структура

- api-server/ — Express API + Telegram бот
- frontend/   — React + Vite Telegram Mini App
- lib-db/     — Drizzle ORM + PostgreSQL схема
- railway.json — Railway конфигурация
