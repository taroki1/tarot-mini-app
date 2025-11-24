# 🚀 Быстрый старт - Telegram Mini App для тарологов

## Предварительные требования

- Node.js 16+ и npm
- PostgreSQL 12+
- Telegram Bot Token (получить у [@BotFather](https://t.me/BotFather))

## 1. Установка зависимостей

```bash
npm install
```

## 2. Настройка базы данных

### Создание базы данных

```bash
# Подключитесь к PostgreSQL
psql -U postgres

# Создайте базу данных
CREATE DATABASE tarot_app;

# Выход
\q
```

### Применение схемы

```bash
psql -U postgres -d tarot_app -f database_schema.sql
```

## 3. Настройка переменных окружения

```bash
# Скопируйте пример файла
cp .env.example .env

# Отредактируйте .env и укажите ваши настройки
nano .env
```

**Минимально необходимые переменные:**

```env
PORT=3000
DATABASE_URL=postgresql://postgres:password@localhost:5432/tarot_app
TELEGRAM_BOT_TOKEN=your_bot_token_here
JWT_SECRET=your_secret_key_here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
```

## 4. Сборка frontend

```bash
# Для разработки (с hot-reload)
npm run dev-client

# Для production
npm run build
```

## 5. Запуск сервера

```bash
# Для разработки
npm run dev

# Для production
npm start
```

## 6. Настройка Telegram Bot

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Создайте нового бота командой `/newbot`
3. Получите токен и добавьте в `.env`
4. Настройте Mini App:
   ```
   /setmenubutton
   Выберите вашего бота
   Введите URL: https://your-domain.com
   ```

## 7. Первый вход в админ-панель

1. Откройте приложение в Telegram
2. Перейдите на вкладку "Админ"
3. Войдите с учетными данными из `.env`:
   - Username: admin
   - Password: your_secure_password

## 8. Добавление тестовых данных

### Добавление таролога через админ-панель:

1. Войдите в админ-панель
2. Перейдите на вкладку "Добавить"
3. Заполните форму:
   - **Имя**: Анна Тарологова
   - **Описание**: Практикующий таролог с 5-летним опытом
   - **Специализация**: Отношения и любовь
   - **Ценовой диапазон**: 2000-3500 руб
   - **Telegram username**: anna_tarot
   - **Курсы**: Базовый курс Таро, Расклады на отношения

4. Нажмите "Добавить таролога"

### Добавление через SQL (альтернатива):

```sql
INSERT INTO tarot_readers (
  name, description, specialization, price_range,
  telegram_username, photo_url, is_active
) VALUES (
  'Мария Звездная',
  'Помогаю находить ответы через карты Таро более 7 лет',
  'Отношения и любовь',
  '1500-2500 руб',
  'maria_stars',
  'https://example.com/photo.jpg',
  true
);
```

## 9. Проверка работы

1. Откройте приложение в Telegram
2. Убедитесь, что видны добавленные тарологи
3. Попробуйте:
   - Фильтры по специализации
   - Открытие профиля таролога
   - Запись на консультацию (тестовая)

## Структура проекта

```
tarot-mini-app/
├── public/                 # Frontend
│   ├── src/
│   │   ├── components/    # React компоненты
│   │   ├── App.jsx       # Главный компонент
│   │   └── index.js      # Точка входа
│   └── index.html        # HTML шаблон
├── server.js             # Backend сервер
├── database_schema.sql   # Схема БД
├── .env.example         # Пример переменных окружения
├── webpack.config.js    # Конфигурация Webpack
└── package.json         # Зависимости

```

## Основные команды

```bash
# Установка зависимостей
npm install

# Запуск dev-сервера (backend)
npm run dev

# Запуск dev-сервера (frontend с hot-reload)
npm run dev-client

# Production сборка frontend
npm run build

# Запуск production сервера
npm start
```

## Порты по умолчанию

- **Backend API**: http://localhost:3000
- **Frontend Dev Server**: http://localhost:3001

Frontend dev server проксирует API запросы на backend автоматически.

## Troubleshooting

### Ошибка подключения к БД

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Решение**: Проверьте, что PostgreSQL запущен:
```bash
# Linux
sudo systemctl status postgresql

# macOS
brew services list
```

### Ошибка при сборке frontend

```
Module not found: Error: Can't resolve 'react'
```

**Решение**: Переустановите зависимости:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Telegram Web App не открывается

**Решение**:
1. Проверьте, что URL в BotFather указан правильно
2. Убедитесь, что используется HTTPS (для production)
3. Проверьте CORS настройки в `server.js`

## Дальнейшие шаги

1. ✅ Настройте HTTPS (обязательно для production)
2. ✅ Измените пароль администратора
3. ✅ Добавьте реальных тарологов
4. ✅ Создайте рекламный баннер
5. ✅ Напишите первую статью в блог
6. ✅ Настройте backup базы данных

## Полезные ссылки

- [Telegram Web Apps Documentation](https://core.telegram.org/bots/webapps)
- [React Documentation](https://react.dev)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## Поддержка

Если возникли вопросы или проблемы:
1. Проверьте документацию в `README.md` и `DEPLOYMENT_GUIDE.md`
2. Посмотрите Issues на GitHub
3. Создайте новый Issue с подробным описанием проблемы

---

**Создано с 💜 для развития сообщества тарологов**
