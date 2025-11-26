# 📦 Полное руководство по развёртыванию "В Курсе ?" на Debian сервере

**Автор:** Replit Agent  
**Дата:** 7 ноября 2025  
**Для проекта:** В Курсе ? (образовательная платформа)

---

## 📋 Содержание

1. [Требования к серверу](#требования-к-серверу)
2. [Подготовка сервера](#подготовка-сервера)
3. [Установка PostgreSQL](#установка-postgresql)
4. [Настройка PostgreSQL](#настройка-postgresql)
5. [Экспорт данных из Replit](#экспорт-данных-из-replit)
6. [Установка Node.js](#установка-nodejs)
7. [Установка Nginx](#установка-nginx)
8. [Копирование кода приложения](#копирование-кода-приложения)
9. [Изменение кода для работы без Neon](#изменение-кода-для-работы-без-neon)
10. [Настройка переменных окружения](#настройка-переменных-окружения)
11. [Настройка Telegram бота с 2FA](#настройка-telegram-бота-с-2fa) ⭐ НОВОЕ
12. [Импорт данных в PostgreSQL](#импорт-данных-в-postgresql)
13. [Сборка приложения](#сборка-приложения)
14. [Настройка PM2](#настройка-pm2)
15. [Настройка Nginx](#настройка-nginx-1)
16. [Настройка SSL](#настройка-ssl)
17. [Настройка файрволла](#настройка-файрволла)
18. [Настройка бэкапов](#настройка-бэкапов)
19. [Тестирование](#тестирование)
20. [Мониторинг](#мониторинг)
21. [Распространённые проблемы](#распространённые-проблемы)

---

## 🖥️ Требования к серверу

### Минимальные характеристики:
- **ОС:** Debian 11/12 или Ubuntu 20.04/22.04 LTS
- **CPU:** 2 ядра (рекомендуется 4)
- **RAM:** 4 GB (рекомендуется 8 GB)
- **Диск:** 50 GB SSD (для БД и файлов)
- **Сеть:** Публичный IP адрес
- **Домен:** Ваш домен с настроенным DNS (например, vcurse.ru)

### Что вам понадобится:
- ✅ SSH доступ к серверу (root или sudo)
- ✅ Доменное имя (для SSL)
- ✅ Базовые знания Linux командной строки

---

## 🔧 Подготовка сервера

### Шаг 1: Подключение к серверу

```bash
# Подключитесь к серверу по SSH
ssh root@ваш_ip_адрес

# Или если у вас есть sudo пользователь:
ssh username@ваш_ip_адрес
```

### Шаг 2: Обновление системы

```bash
# Обновить список пакетов
sudo apt update

# Обновить все установленные пакеты
sudo apt upgrade -y

# Установить базовые инструменты
sudo apt install -y curl wget git build-essential software-properties-common
```

### Шаг 3: Создание пользователя для приложения (опционально, но рекомендуется)

```bash
# Создать пользователя vcurse
sudo adduser vcurse

# Добавить в группу sudo (если нужен sudo доступ)
sudo usermod -aG sudo vcurse

# Переключиться на нового пользователя
su - vcurse
```

---

## 🗄️ Установка PostgreSQL

### Шаг 1: Установка PostgreSQL 16

```bash
# Добавить официальный репозиторий PostgreSQL
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'

# Добавить ключ репозитория
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

# Обновить список пакетов
sudo apt update

# Установить PostgreSQL 16
sudo apt install -y postgresql-16 postgresql-contrib-16

# Проверить статус
sudo systemctl status postgresql
```

**Что вы должны увидеть:**
```
● postgresql.service - PostgreSQL RDBMS
   Loaded: loaded (/lib/systemd/system/postgresql.service; enabled)
   Active: active (exited) since ...
```

### Шаг 2: Включить автозапуск

```bash
sudo systemctl enable postgresql
```

---

## ⚙️ Настройка PostgreSQL

### Шаг 1: Создание базы данных и пользователя

```bash
# Переключиться на пользователя postgres
sudo -u postgres psql

# В консоли PostgreSQL выполнить:
```

```sql
-- Создать базу данных
CREATE DATABASE vcurse_db;

-- Создать пользователя с сильным паролем
CREATE USER vcurse_user WITH PASSWORD 'ВАШ_ОЧЕНЬ_СИЛЬНЫЙ_ПАРОЛЬ_123!';

-- Дать пользователю все права на базу данных
GRANT ALL PRIVILEGES ON DATABASE vcurse_db TO vcurse_user;

-- Выйти
\q
```

**💡 Генерация сильного пароля:**
```bash
# Сгенерировать случайный пароль
openssl rand -base64 32
```

Сохраните этот пароль в надёжном месте!

### Шаг 2: Настройка доступа (для локального подключения)

```bash
# Редактировать файл конфигурации
sudo nano /etc/postgresql/16/main/pg_hba.conf
```

**Добавьте в конец файла:**
```
# Разрешить локальные подключения с паролем
local   all             vcurse_user                             scram-sha-256
host    vcurse_db       vcurse_user     127.0.0.1/32            scram-sha-256
host    vcurse_db       vcurse_user     ::1/128                 scram-sha-256
```

**Сохраните:** `Ctrl+X`, затем `Y`, затем `Enter`

### Шаг 3: Настройка производительности (опционально)

```bash
# Редактировать основной конфиг
sudo nano /etc/postgresql/16/main/postgresql.conf
```

**Рекомендуемые настройки для 8GB RAM:**
```conf
# Память
shared_buffers = 2GB
effective_cache_size = 6GB
work_mem = 32MB
maintenance_work_mem = 512MB

# Соединения
max_connections = 200

# Логирование (для отладки)
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_line_prefix = '%m [%p] %u@%d '
```

**Для 4GB RAM используйте:**
```conf
shared_buffers = 1GB
effective_cache_size = 3GB
work_mem = 16MB
maintenance_work_mem = 256MB
max_connections = 100
```

**Сохраните:** `Ctrl+X`, затем `Y`, затем `Enter`

### Шаг 4: Перезапуск PostgreSQL

```bash
sudo systemctl restart postgresql

# Проверить статус
sudo systemctl status postgresql
```

### Шаг 5: Тест подключения

```bash
# Проверить подключение
psql -h localhost -U vcurse_user -d vcurse_db

# Если попросит пароль - введите пароль, который вы создали
# Должны увидеть:
# vcurse_db=>

# Выйти
\q
```

---

## 💾 Экспорт данных из Replit

**⚠️ ВАЖНО:** Этот шаг выполняется НА ВАШЕМ КОМПЬЮТЕРЕ, подключённом к Replit!

### Шаг 1: Установка PostgreSQL клиента на ваш компьютер

**Linux/WSL:**
```bash
sudo apt install postgresql-client
```

**macOS:**
```bash
brew install postgresql
```

**Windows:**
Скачайте и установите [PostgreSQL](https://www.postgresql.org/download/windows/)

### Шаг 2: Получение DATABASE_URL из Replit

1. Откройте ваш проект на Replit
2. Откройте "Secrets" (замок в левом меню)
3. Найдите переменную `DATABASE_URL`
4. Скопируйте её значение

Должно выглядеть примерно так:
```
postgresql://neondb_owner:npg_xxxxxxxxxxxxx@ep-xxxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### Шаг 3: Экспорт базы данных

```bash
# На вашем компьютере выполните:
pg_dump "postgresql://neondb_owner:npg_xxxxx..." > vcurse_backup.sql

# Это создаст файл vcurse_backup.sql со всеми данными
```

**Проверьте размер файла:**
```bash
ls -lh vcurse_backup.sql
```

Должен быть больше 0 байт!

### Шаг 4: Копирование файла на сервер

```bash
# С вашего компьютера скопируйте файл на сервер
scp vcurse_backup.sql root@ваш_ip:/tmp/vcurse_backup.sql

# Или если используете пользователя vcurse:
scp vcurse_backup.sql vcurse@ваш_ip:/home/vcurse/vcurse_backup.sql
```

**💡 Альтернативный способ (если scp не работает):**

1. Откройте файл `vcurse_backup.sql` на вашем компьютере
2. Скопируйте содержимое
3. На сервере создайте файл:
```bash
nano /tmp/vcurse_backup.sql
```
4. Вставьте содержимое (`Ctrl+Shift+V`)
5. Сохраните (`Ctrl+X`, `Y`, `Enter`)

---

## 📦 Установка Node.js

### Шаг 1: Установка Node.js 20 (та же версия что на Replit)

```bash
# Добавить репозиторий NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Установить Node.js
sudo apt install -y nodejs

# Проверить версию
node --version
# Должно показать: v20.x.x

npm --version
# Должно показать: 10.x.x
```

### Шаг 2: Установка глобальных пакетов

```bash
# Установить PM2 (менеджер процессов)
sudo npm install -g pm2

# Проверить установку
pm2 --version
```

---

## 🌐 Установка Nginx

```bash
# Установить Nginx
sudo apt install -y nginx

# Запустить и включить автозапуск
sudo systemctl start nginx
sudo systemctl enable nginx

# Проверить статус
sudo systemctl status nginx
```

**Проверка:** Откройте в браузере `http://ваш_ip` - должна показаться страница "Welcome to nginx!"

---

## 📁 Копирование кода приложения

### Вариант 1: Через Git (рекомендуется)

**Если ваш код на GitHub/GitLab:**

```bash
# Создать директорию для приложения
cd /home/vcurse
mkdir -p vcurse-app
cd vcurse-app

# Клонировать репозиторий
git clone https://github.com/ваш_username/vcurse.git .

# Если приватный репозиторий - нужен GitHub Personal Access Token
```

### Вариант 2: Скачать ZIP с Replit

1. На Replit откройте ваш проект
2. Нажмите три точки (⋮) рядом с Files
3. Выберите "Download as zip"
4. Скачайте файл

**Затем на сервере:**

```bash
cd /home/vcurse
mkdir -p vcurse-app
cd vcurse-app

# Скопировать ZIP с вашего компьютера
# На вашем компьютере:
scp repl-download.zip vcurse@ваш_ip:/home/vcurse/vcurse-app/

# На сервере:
sudo apt install -y unzip
unzip repl-download.zip
rm repl-download.zip
```

### Вариант 3: Ручное копирование файлов

Создайте структуру вручную и скопируйте файлы через SFTP клиент (FileZilla, WinSCP)

---

## 🔧 Изменение кода для работы без Neon

### Шаг 1: Изменить package.json

```bash
cd /home/vcurse/vcurse-app
nano package.json
```

**Найдите строку с `@neondatabase/serverless` и удалите её:**
```json
"@neondatabase/serverless": "^0.10.4",  ← УДАЛИТЬ ЭТУ СТРОКУ
```

**Добавьте обычный PostgreSQL драйвер:**
```json
"pg": "^8.11.3",
```

**Сохраните:** `Ctrl+X`, `Y`, `Enter`

### Шаг 2: Изменить server/db.ts

```bash
nano server/db.ts
```

**Замените ВСЁ содержимое файла на:**

```typescript
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Настройка пула соединений
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: false // Для локального подключения SSL не нужен
});

// Обработка ошибок пула
pool.on('error', (err: any) => {
  console.error('[DB Pool] Unexpected error on idle client:', err.message);
  if (err.code) {
    console.error('[DB Pool] Error code:', err.code);
  }
});

pool.on('connect', () => {
  console.log('[DB Pool] New client connected');
});

pool.on('remove', () => {
  console.log('[DB Pool] Client removed from pool');
});

export const db = drizzle(pool, { schema });

// Graceful shutdown
export async function closeDatabase() {
  console.log('[DB] Closing database connections...');
  try {
    await pool.end();
    console.log('[DB] All database connections closed');
  } catch (error) {
    console.error('[DB] Error closing database:', error);
  }
}
```

**Сохраните:** `Ctrl+X`, `Y`, `Enter`

### Шаг 3: Удалить зависимость от ws

```bash
nano package.json
```

**В секции `dependencies` найдите и удалите строку:**
```json
"ws": "^8.18.0",  ← УДАЛИТЬ
```

**В секции `devDependencies` найдите и удалите строку:**
```json
"@types/ws": "^8.5.13",  ← УДАЛИТЬ
```

**Сохраните:** `Ctrl+X`, `Y`, `Enter`

### Шаг 4: Установить зависимости

```bash
# Удалить старые node_modules
rm -rf node_modules package-lock.json

# Установить зависимости
npm install

# Должно пройти без ошибок!
```

**Если возникла ошибка:**
```bash
# Попробуйте с флагом --legacy-peer-deps
npm install --legacy-peer-deps
```

---

## 🔐 Настройка переменных окружения

### Шаг 1: Создать файл .env

```bash
cd /home/vcurse/vcurse-app
nano .env
```

### Шаг 2: Добавить все переменные окружения

**Скопируйте этот шаблон и заполните значения:**

```env
# === Database ===
DATABASE_URL=postgresql://vcurse_user:ВАШ_ПАРОЛЬ@localhost:5432/vcurse_db

# === Server ===
NODE_ENV=production
PORT=5000

# === Session Secret (ОБЯЗАТЕЛЬНО ИЗМЕНИТЬ!) ===
SESSION_SECRET=ВАШ_СЛУЧАЙНЫЙ_СЕКРЕТ_МИНИМУМ_32_СИМВОЛА

# === Google Cloud Storage (если используете) ===
GCS_BUCKET_NAME=ваш_bucket_name
GOOGLE_APPLICATION_CREDENTIALS=/home/vcurse/vcurse-app/gcs-credentials.json

# === Telegram Bot ===
TELEGRAM_BOT_TOKEN=ваш_telegram_bot_token

# === Replit Auth (если используете) ===
# OIDC_ISSUER_URL=...
# OIDC_CLIENT_ID=...
# OIDC_CLIENT_SECRET=...

# === Public URL ===
VITE_API_URL=https://ваш_домен.ru
```

**💡 Генерация SESSION_SECRET:**
```bash
# Сгенерировать случайный секрет
openssl rand -base64 48
```

**Замените значения:**
- `ВАШ_ПАРОЛЬ` - пароль PostgreSQL который вы создали
- `ВАШ_СЛУЧАЙНЫЙ_СЕКРЕТ` - сгенерированный секрет
- `ваш_bucket_name` - имя вашего GCS бакета
- `ваш_telegram_bot_token` - токен Telegram бота
- `ваш_домен.ru` - ваш домен

**Сохраните:** `Ctrl+X`, `Y`, `Enter`

### Шаг 3: Защитить файл .env

```bash
# Только владелец может читать
chmod 600 .env

# Проверить
ls -la .env
# Должно показать: -rw------- 1 vcurse vcurse
```

---

## 🤖 Настройка Telegram бота с 2FA

Ваше приложение использует Telegram бота для:
- 🔐 **Двухфакторной аутентификации (2FA)** при входе
- 🔗 **Привязки Telegram аккаунта** к профилю пользователя
- 📬 **Отправки уведомлений** (покупки, новые уроки, админ-сообщения)
- 🌐 **Связи с пользователями** во время блокировок интернета

### Как работает бот:

1. **Привязка аккаунта:**
   - Пользователь открывает бота → отправляет `/start`
   - Бот генерирует 6-значный код (действителен 10 минут)
   - Пользователь вводит код на сайте
   - Аккаунты связываются

2. **2FA при входе:**
   - Пользователь вводит email и пароль
   - Если Telegram привязан → бот автоматически отправляет код
   - Пользователь вводит код → вход выполнен

3. **Уведомления:**
   - Все важные события дублируются в Telegram
   - Работает даже при блокировке сайта

---

### Шаг 1: Создание Telegram бота через BotFather

**1.1. Откройте Telegram и найдите @BotFather**

В Telegram найдите официального бота: **@BotFather**

**1.2. Создайте нового бота**

Отправьте команду:
```
/newbot
```

**1.3. Назовите бота**

BotFather спросит имя бота (отображаемое):
```
"В Курсе ?" - Помощник платформы
```

Или любое другое имя на ваш выбор.

**1.4. Назначьте username бота**

Username должен заканчиваться на `bot`:
```
vcurse_helper_bot
```

Или:
```
vcurse_platform_bot
vcurse_edu_bot
```

**⚠️ ВАЖНО:** Username должен быть уникальным и свободным!

**1.5. Получите токен**

После создания BotFather выдаст вам токен:
```
Done! Congratulations on your new bot. You will find it at t.me/vcurse_helper_bot. 

Use this token to access the HTTP API:
1234567890:ABCdefGHIjklMNOpqrsTUVwxyz1234567890

For a description of the Bot API, see this page: https://core.telegram.org/bots/api
```

**🔑 СОХРАНИТЕ ЭТОТ ТОКЕН!** Это ваш `TELEGRAM_BOT_TOKEN`

---

### Шаг 2: Настройка бота (необязательно, но рекомендуется)

**2.1. Установите описание бота**

```
/setdescription
```

Выберите вашего бота, затем отправьте описание:
```
Я официальный бот образовательной платформы "В Курсе ?". Помогу связать аккаунт, настроить двухфакторную защиту и присылать уведомления о новых курсах!
```

**2.2. Установите информацию о боте**

```
/setabouttext
```

Выберите вашего бота:
```
🎓 Официальный бот платформы "В Курсе ?"
🔐 2FA и уведомления
```

**2.3. Установите фото профиля (опционально)**

```
/setuserpic
```

Выберите бота и загрузите квадратное изображение (логотип платформы)

**2.4. Установите команды бота**

```
/setcommands
```

Выберите бота и отправьте:
```
start - Начать работу / Получить код для привязки
```

---

### Шаг 3: Добавить токен в .env файл

**На вашем сервере:**

```bash
cd /home/vcurse/vcurse-app
nano .env
```

**Найдите строку:**
```env
# === Telegram Bot ===
TELEGRAM_BOT_TOKEN=ваш_telegram_bot_token
```

**Замените на ваш токен:**
```env
# === Telegram Bot ===
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz1234567890
```

**Сохраните:** `Ctrl+X`, `Y`, `Enter`

---

### Шаг 4: Подготовка изображения для бота

Бот отправляет приветственное изображение при команде `/start`.

**4.1. Проверьте наличие изображения**

```bash
ls -la /home/vcurse/vcurse-app/attached_assets/bot_welcome_logo.png
```

**Если файл отсутствует:**

**Вариант А: Скачать с Replit**

1. На Replit откройте файл `attached_assets/bot_welcome_logo.png`
2. Нажмите правой кнопкой → Download
3. Скопируйте на сервер:

```bash
# На вашем компьютере:
scp bot_welcome_logo.png vcurse@ваш_ip:/home/vcurse/vcurse-app/attached_assets/

# На сервере проверьте:
ls -la /home/vcurse/vcurse-app/attached_assets/bot_welcome_logo.png
```

**Вариант Б: Использовать свой логотип**

```bash
# Создайте директорию если её нет
mkdir -p /home/vcurse/vcurse-app/attached_assets

# Скопируйте ваше изображение
scp your_logo.png vcurse@ваш_ip:/home/vcurse/vcurse-app/attached_assets/bot_welcome_logo.png
```

**Требования к изображению:**
- Формат: PNG или JPG
- Размер: до 5 MB
- Рекомендуемое разрешение: 800x600 или 1200x900 пикселей
- Должно содержать логотип или название платформы

**Вариант В: Создать заглушку (если нет изображения)**

```bash
# Отключить отправку фото в коде (временно)
# Бот будет отправлять только текст без изображения
```

Если хотите временно отключить фото - скажите, я покажу как изменить код.

---

### Шаг 5: Проверка настроек бота

**5.1. Проверьте что токен в .env**

```bash
cd /home/vcurse/vcurse-app
cat .env | grep TELEGRAM_BOT_TOKEN
```

**Должно показать ваш токен (не пустую строку!)**

**5.2. Проверьте изображение**

```bash
ls -la attached_assets/bot_welcome_logo.png

# Должно показать размер файла > 0 байт
```

---

### Шаг 6: Как работает бот (техническая информация)

**Архитектура:**

1. **Polling-based система**
   - Бот использует long polling (не webhooks)
   - Каждые 30 секунд проверяет новые сообщения
   - Работает автономно вместе с основным приложением

2. **In-memory хранилище**
   - Коды хранятся в памяти (не в БД)
   - Автоматическое удаление истёкших сессий каждые 5 минут
   - Коды хешируются через SHA-256 (plaintext никогда не хранится)

3. **Безопасность**
   - ✅ Коды одноразовые
   - ✅ TTL для кодов: привязка 10 минут, 2FA 5 минут
   - ✅ Rate limiting: 5 попыток на сессию
   - ✅ Уникальность: один Telegram = один аккаунт (constraint в БД)

4. **Команды бота**
   - `/start` - главная команда (генерирует код для привязки)
   - Автоматическая обработка сообщений
   - Fallback на Telegram ID если нет username

**Логика работы `/start`:**

```
Пользователь отправляет /start
    ↓
Бот проверяет: уже привязан?
    ↓ ДА → Отправляет "С возвращением! ✅"
    ↓ НЕТ
Генерирует 6-значный код (123456)
    ↓
Хеширует код (SHA-256)
    ↓
Сохраняет в память (expires: 10 мин)
    ↓
Отправляет фото + код в Telegram
    ↓
Пользователь вводит код на сайте
    ↓
Сайт проверяет hash кода
    ↓ MATCH → Аккаунты связываются!
    ↓ NO MATCH → "Неверный код"
```

---

### Шаг 7: Тестирование бота

**После того как приложение запущено через PM2:**

**7.1. Проверьте логи запуска бота**

```bash
pm2 logs vcurse | grep "Telegram Bot"

# Должны увидеть:
# [Telegram Bot] Starting polling-based bot...
# [Telegram Bot] Webhook deleted
```

**7.2. Откройте бота в Telegram**

Найдите вашего бота по username:
```
@vcurse_helper_bot
```

(Или как вы его назвали)

**7.3. Отправьте команду /start**

Бот должен ответить:
- Приветственное изображение (логотип)
- Текст с объяснением преимуществ
- **6-значный код** (например: `🔐 123456`)

**7.4. Проверьте логи сервера**

```bash
pm2 logs vcurse --lines 20

# Должны увидеть:
# [Telegram Bot] Received message from 123456789: /start
# [Telegram Bot] Sent linking code to chat_id 123456789 (username)
```

**7.5. Попробуйте привязать аккаунт**

1. Откройте ваш сайт
2. Зарегистрируйтесь или войдите
3. Перейдите в настройки профиля
4. Найдите раздел "Telegram"
5. Введите код из бота
6. Нажмите "Привязать"

**Должно показать:**
```
✅ Telegram успешно привязан!
```

**7.6. Проверьте в БД**

```bash
psql -h localhost -U vcurse_user -d vcurse_db

SELECT email, "telegramChatId", "telegramUsername" FROM users WHERE "telegramChatId" IS NOT NULL;

# Должны увидеть ваш аккаунт с привязанным Telegram!

\q
```

**7.7. Тест 2FA (если Telegram привязан)**

1. Выйдите с сайта
2. Войдите снова (email + пароль)
3. **Автоматически** должен открыться ввод кода 2FA
4. Проверьте Telegram - бот отправил код
5. Введите код → вход выполнен ✅

---

### Шаг 8: Распространённые проблемы с ботом

#### Проблема 1: "Бот не отвечает на /start"

**Причина:** Токен не настроен или неверный

**Решение:**
```bash
# Проверить токен
cat .env | grep TELEGRAM_BOT_TOKEN

# Проверить что приложение запущено
pm2 status

# Проверить логи на ошибки
pm2 logs vcurse | grep -i telegram

# Перезапустить приложение
pm2 restart vcurse
```

#### Проблема 2: "Cannot send photo: ENOENT"

**Причина:** Изображение `bot_welcome_logo.png` не найдено

**Решение:**
```bash
# Проверить наличие файла
ls -la /home/vcurse/vcurse-app/attached_assets/bot_welcome_logo.png

# Если файла нет - скопируйте его (см. Шаг 4)
# Или временно отключите отправку фото
```

**Временное отключение фото (если нет изображения):**

```bash
nano server/telegram-bot.ts
```

Найдите функцию `processStartCommand` и замените `sendTelegramPhoto` на `sendTelegramMessage`:

```typescript
// Было:
await sendTelegramPhoto(chatId, 'attached_assets/bot_welcome_logo.png', `текст...`);

// Стало:
await sendTelegramMessage(chatId, `текст...`);
```

Пересоберите и перезапустите:
```bash
npm run build
pm2 restart vcurse
```

#### Проблема 3: "Код истёк" или "Неверный код"

**Причина:** Код живёт только 10 минут или уже использован

**Решение:**
1. Отправьте `/start` заново в боте
2. Получите новый код
3. Введите его быстрее (в течение 10 минут)

#### Проблема 4: Бот не запускается (нет в логах)

**Причина:** `TELEGRAM_BOT_TOKEN` пустой или отсутствует

**Решение:**
```bash
# Проверить .env
cat .env | grep TELEGRAM_BOT_TOKEN

# Убедиться что значение не пустое!
# Должно быть: TELEGRAM_BOT_TOKEN=1234567890:ABC...

# Перезапустить приложение
pm2 restart vcurse

# Проверить логи
pm2 logs vcurse --lines 50 | grep -i telegram
```

#### Проблема 5: "This chat_id is already linked"

**Причина:** Один Telegram пытаются привязать к нескольким аккаунтам

**Решение:**

Это защита от злоупотреблений! Один Telegram = один аккаунт.

```bash
# Проверить в БД кто уже привязан
psql -h localhost -U vcurse_user -d vcurse_db

SELECT id, email, "telegramChatId" FROM users WHERE "telegramChatId" = 'YOUR_CHAT_ID';

\q
```

Если нужно отвязать старый аккаунт:
```sql
-- ОСТОРОЖНО! Это отвяжет Telegram от аккаунта
UPDATE users SET "telegramChatId" = NULL WHERE id = 'user_id';
```

---

### Шаг 9: Мониторинг бота

**Проверка работы бота:**

```bash
# Логи бота в реальном времени
pm2 logs vcurse | grep "Telegram Bot"

# Статистика сессий (в коде бота)
# Проверить количество активных сессий привязки
# (информация в памяти, при перезапуске сбрасывается)

# Проверить количество привязанных пользователей
psql -h localhost -U vcurse_user -d vcurse_db -c "SELECT COUNT(*) FROM users WHERE \"telegramChatId\" IS NOT NULL;"
```

**Полезные метрики:**
- Количество привязанных аккаунтов
- Количество успешных 2FA входов
- Количество отправленных уведомлений

---

### Шаг 10: Дополнительные функции бота

Ваш бот автоматически отправляет уведомления о:

1. **Покупках:**
   - Курсы, пакеты, VIP, программы
   - Подтверждение покупки с деталями

2. **Отзывах:**
   - Одобрение отзыва администратором
   - Реакции на ваши отзывы

3. **Sniper системе:**
   - Статус вашего запроса курса
   - Комментарии администратора

4. **Новых уроках:**
   - Умная система группировки (1 уведомление на курс за 30 минут)
   - Предотвращает спам при массовой загрузке

5. **Админ-рассылках:**
   - Важные объявления всем пользователям

**Все уведомления дублируются в Telegram если аккаунт привязан!**

---

### 📝 Чеклист настройки Telegram бота

- [ ] Создан бот через @BotFather
- [ ] Получен токен бота
- [ ] Токен добавлен в `.env` файл
- [ ] Изображение `bot_welcome_logo.png` скопировано
- [ ] Приложение пересобрано (`npm run build`)
- [ ] PM2 перезапущен (`pm2 restart vcurse`)
- [ ] В логах видно "Starting polling-based bot..."
- [ ] Бот отвечает на `/start` в Telegram
- [ ] Код привязки работает на сайте
- [ ] 2FA работает при входе
- [ ] Уведомления приходят в Telegram

**Если всё отмечено ✅ - бот полностью настроен!**

---

## 📊 Импорт данных в PostgreSQL

### Шаг 1: Импортировать дамп

```bash
# Импортировать данные из файла бэкапа
psql -h localhost -U vcurse_user -d vcurse_db < /tmp/vcurse_backup.sql

# Или если файл в home директории:
psql -h localhost -U vcurse_user -d vcurse_db < /home/vcurse/vcurse_backup.sql
```

**Введите пароль когда попросит**

**Что вы должны увидеть:**
```
SET
SET
SET
...
CREATE TABLE
CREATE TABLE
...
COPY 150
COPY 45
...
```

Это означает что таблицы создаются и данные копируются!

### Шаг 2: Проверить импорт

```bash
# Подключиться к БД
psql -h localhost -U vcurse_user -d vcurse_db

# Проверить таблицы
\dt

# Должны увидеть список всех таблиц:
# users, courses, purchases, и т.д.

# Проверить количество пользователей
SELECT COUNT(*) FROM users;

# Выйти
\q
```

### Шаг 3: Дать права на схему (если были ошибки доступа)

```bash
sudo -u postgres psql vcurse_db
```

```sql
-- Дать права на схему public
GRANT ALL ON SCHEMA public TO vcurse_user;

-- Дать права на все таблицы
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO vcurse_user;

-- Дать права на последовательности (для SERIAL полей)
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO vcurse_user;

-- Выйти
\q
```

---

## 🏗️ Сборка приложения

### Шаг 1: Собрать фронтенд и бэкенд

```bash
cd /home/vcurse/vcurse-app

# Собрать приложение
npm run build
```

**Что должно произойти:**
1. Vite соберёт фронтенд (React приложение)
2. esbuild соберёт бэкенд (Express сервер)
3. Создастся папка `dist/` с собранными файлами

**Проверьте:**
```bash
ls -la dist/
# Должны увидеть:
# index.js - собранный сервер
# public/ - собранный фронтенд
```

**Если возникли ошибки при сборке:**

```bash
# Попробуйте очистить кэш
rm -rf node_modules/.vite
rm -rf dist

# Соберите заново
npm run build
```

---

## 🚀 Настройка PM2

PM2 - это менеджер процессов который будет держать ваше приложение запущенным.

### Шаг 1: Создать конфигурацию PM2

```bash
cd /home/vcurse/vcurse-app
nano ecosystem.config.js
```

**Добавьте конфигурацию:**

```javascript
module.exports = {
  apps: [{
    name: 'vcurse',
    script: './dist/index.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env_production: {
      NODE_ENV: 'production'
    }
  }]
};
```

**Сохраните:** `Ctrl+X`, `Y`, `Enter`

### Шаг 2: Создать директорию для логов

```bash
mkdir -p logs
```

### Шаг 3: Запустить приложение через PM2

```bash
# Запустить приложение
pm2 start ecosystem.config.js --env production

# Проверить статус
pm2 status

# Должны увидеть:
# │ vcurse │ 0 │ online │
```

### Шаг 4: Настроить автозапуск

```bash
# Сохранить текущую конфигурацию PM2
pm2 save

# Настроить автозапуск при загрузке системы
pm2 startup

# PM2 выдаст команду которую нужно выполнить, например:
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u vcurse --hp /home/vcurse

# СКОПИРУЙТЕ И ВЫПОЛНИТЕ ЭТУ КОМАНДУ!
```

### Шаг 5: Полезные команды PM2

```bash
# Посмотреть логи
pm2 logs vcurse

# Остановить приложение
pm2 stop vcurse

# Перезапустить
pm2 restart vcurse

# Удалить из PM2
pm2 delete vcurse

# Мониторинг в реальном времени
pm2 monit
```

**Проверьте что приложение работает:**
```bash
# Проверить что сервер слушает на порту 5000
sudo netstat -tulpn | grep 5000

# Должны увидеть:
# tcp  0  0  0.0.0.0:5000  0.0.0.0:*  LISTEN  12345/node
```

---

## 🌐 Настройка Nginx

Nginx будет работать как reverse proxy - принимать запросы на порту 80/443 и перенаправлять на ваше приложение на порту 5000.

### Шаг 1: Создать конфигурацию сайта

```bash
sudo nano /etc/nginx/sites-available/vcurse
```

**Добавьте конфигурацию (ПОКА БЕЗ SSL):**

```nginx
# Перенаправление с www на без www
server {
    listen 80;
    listen [::]:80;
    server_name www.ваш_домен.ru;
    return 301 http://ваш_домен.ru$request_uri;
}

# Основной сервер
server {
    listen 80;
    listen [::]:80;
    server_name ваш_домен.ru;

    # Логи
    access_log /var/log/nginx/vcurse_access.log;
    error_log /var/log/nginx/vcurse_error.log;

    # Максимальный размер загружаемых файлов
    client_max_body_size 500M;

    # Proxy к Node.js приложению
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        
        # WebSocket поддержка
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        
        # Заголовки
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Таймауты
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Отключить буферизацию для SSE/streaming
        proxy_buffering off;
        proxy_cache_bypass $http_upgrade;
    }

    # Статические файлы (опционально, для кэширования)
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:5000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**ВАЖНО: Замените `ваш_домен.ru` на ваш реальный домен!**

**Сохраните:** `Ctrl+X`, `Y`, `Enter`

### Шаг 2: Активировать конфигурацию

```bash
# Создать символическую ссылку
sudo ln -s /etc/nginx/sites-available/vcurse /etc/nginx/sites-enabled/

# Удалить дефолтную конфигурацию
sudo rm /etc/nginx/sites-enabled/default
```

### Шаг 3: Проверить конфигурацию

```bash
# Проверить синтаксис
sudo nginx -t

# Должно показать:
# nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### Шаг 4: Перезапустить Nginx

```bash
sudo systemctl restart nginx

# Проверить статус
sudo systemctl status nginx
```

### Шаг 5: Проверить работу

**Откройте в браузере:** `http://ваш_домен.ru`

Должен открыться ваш сайт! 🎉

---

## 🔒 Настройка SSL

Используем Let's Encrypt для бесплатного SSL сертификата.

### Шаг 1: Установить Certbot

```bash
# Установить Certbot и плагин для Nginx
sudo apt install -y certbot python3-certbot-nginx
```

### Шаг 2: Получить SSL сертификат

```bash
# Получить сертификат (автоматически настроит Nginx)
sudo certbot --nginx -d ваш_домен.ru -d www.ваш_домен.ru

# Certbot спросит:
# 1. Email - введите ваш email
# 2. Согласие с ToS - Y (да)
# 3. Newsletter - N (нет)
# 4. Redirect HTTP to HTTPS - 2 (да, перенаправлять)
```

**Что должно произойти:**
- Certbot получит сертификат от Let's Encrypt
- Автоматически изменит конфигурацию Nginx
- Добавит HTTPS (порт 443)
- Настроит редирект с HTTP на HTTPS

### Шаг 3: Проверить автообновление

```bash
# Certbot автоматически настраивает cron для обновления
# Проверить таймер
sudo systemctl status certbot.timer

# Тестовое обновление (dry run)
sudo certbot renew --dry-run
```

**Должно показать:**
```
Congratulations, all simulated renewals succeeded
```

### Шаг 4: Проверить HTTPS

**Откройте в браузере:** `https://ваш_домен.ru`

Должен быть замочек 🔒 в адресной строке!

---

## 🔥 Настройка файрволла

Защитите сервер, разрешив только необходимые порты.

### Шаг 1: Установить UFW (если не установлен)

```bash
sudo apt install -y ufw
```

### Шаг 2: Настроить правила

```bash
# Разрешить SSH (ОБЯЗАТЕЛЬНО!)
sudo ufw allow OpenSSH

# Разрешить HTTP и HTTPS
sudo ufw allow 'Nginx Full'

# Или можно явно указать порты:
# sudo ufw allow 80/tcp
# sudo ufw allow 443/tcp

# Проверить правила (до включения)
sudo ufw show added
```

### Шаг 3: Включить файрволл

```bash
# ВНИМАНИЕ: убедитесь что SSH разрешён, иначе потеряете доступ!
sudo ufw enable

# Подтвердить: Y

# Проверить статус
sudo ufw status verbose
```

**Должно показать:**
```
Status: active

To                         Action      From
--                         ------      ----
OpenSSH                    ALLOW       Anywhere
Nginx Full                 ALLOW       Anywhere
```

---

## 💾 Настройка бэкапов

Автоматические бэкапы базы данных каждый день.

### Шаг 1: Создать директорию для бэкапов

```bash
sudo mkdir -p /var/backups/vcurse
sudo chown vcurse:vcurse /var/backups/vcurse
```

### Шаг 2: Создать скрипт бэкапа

```bash
nano /home/vcurse/backup-db.sh
```

**Добавьте скрипт:**

```bash
#!/bin/bash

# Конфигурация
DB_NAME="vcurse_db"
DB_USER="vcurse_user"
BACKUP_DIR="/var/backups/vcurse"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/vcurse_backup_$DATE.sql"
PGPASSWORD="ВАШ_ПАРОЛЬ_PostgreSQL"

# Экспорт переменной окружения
export PGPASSWORD

# Создать бэкап
echo "Starting backup at $(date)"
pg_dump -h localhost -U $DB_USER $DB_NAME > $BACKUP_FILE

# Сжать бэкап
gzip $BACKUP_FILE

# Удалить старые бэкапы (старше 30 дней)
find $BACKUP_DIR -name "vcurse_backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: ${BACKUP_FILE}.gz"
echo "Backup size: $(du -h ${BACKUP_FILE}.gz | cut -f1)"

# Очистить переменную
unset PGPASSWORD
```

**Замените `ВАШ_ПАРОЛЬ_PostgreSQL` на реальный пароль!**

**Сохраните:** `Ctrl+X`, `Y`, `Enter`

### Шаг 3: Сделать скрипт исполняемым

```bash
chmod +x /home/vcurse/backup-db.sh

# Защитить от чтения (пароль внутри!)
chmod 700 /home/vcurse/backup-db.sh
```

### Шаг 4: Протестировать скрипт

```bash
/home/vcurse/backup-db.sh

# Проверить что создался файл
ls -lh /var/backups/vcurse/
```

### Шаг 5: Настроить автоматический запуск через cron

```bash
# Открыть crontab
crontab -e

# Выберите редактор (nano - вариант 1)
```

**Добавьте в конец файла:**

```cron
# Бэкап БД каждый день в 2:00 ночи
0 2 * * * /home/vcurse/backup-db.sh >> /var/log/vcurse-backup.log 2>&1
```

**Сохраните:** `Ctrl+X`, `Y`, `Enter`

**Проверьте crontab:**
```bash
crontab -l
```

---

## ✅ Тестирование

### Шаг 1: Проверить подключение к БД

```bash
# Зайти в приложение и проверить логи PM2
pm2 logs vcurse --lines 50

# Должны увидеть:
# [DB Pool] New client connected
# serving on port 5000
```

### Шаг 2: Проверить основные страницы

**Откройте в браузере:**
- `https://ваш_домен.ru` - главная страница
- `https://ваш_домен.ru/shop` - магазин курсов
- `https://ваш_домен.ru/login` - страница входа

### Шаг 3: Проверить регистрацию и вход

1. Создайте тестовый аккаунт
2. Войдите в систему
3. Проверьте что данные сохраняются в БД

```bash
# Проверить в БД
psql -h localhost -U vcurse_user -d vcurse_db

SELECT email FROM users ORDER BY id DESC LIMIT 5;

\q
```

### Шаг 4: Проверить загрузку файлов (если используете GCS)

1. Попробуйте загрузить изображение
2. Проверьте что оно отображается

### Шаг 5: Проверить производительность

```bash
# Установить Apache Bench
sudo apt install -y apache2-utils

# Тест производительности (100 запросов, 10 одновременно)
ab -n 100 -c 10 https://ваш_домен.ru/
```

---

## 📊 Мониторинг

### Просмотр логов

```bash
# Логи приложения (PM2)
pm2 logs vcurse

# Логи Nginx
sudo tail -f /var/log/nginx/vcurse_access.log
sudo tail -f /var/log/nginx/vcurse_error.log

# Логи PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-16-main.log

# Системные логи
sudo journalctl -u nginx -f
```

### Мониторинг ресурсов

```bash
# CPU и память в реальном времени
htop

# Использование диска
df -h

# Проверить размер БД
sudo -u postgres psql -c "SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname)) AS size FROM pg_database;"
```

### PM2 мониторинг

```bash
# Интерактивный мониторинг
pm2 monit

# Статус всех приложений
pm2 status

# Информация о приложении
pm2 show vcurse
```

---

## 🔧 Распространённые проблемы

### Проблема 1: "Cannot connect to database"

**Причина:** Неправильный DATABASE_URL или PostgreSQL не запущен

**Решение:**
```bash
# Проверить что PostgreSQL работает
sudo systemctl status postgresql

# Проверить DATABASE_URL в .env
cat /home/vcurse/vcurse-app/.env | grep DATABASE_URL

# Проверить подключение вручную
psql -h localhost -U vcurse_user -d vcurse_db
```

### Проблема 2: "502 Bad Gateway" от Nginx

**Причина:** Node.js приложение не запущено

**Решение:**
```bash
# Проверить статус PM2
pm2 status

# Если не запущено - запустить
cd /home/vcurse/vcurse-app
pm2 start ecosystem.config.js --env production

# Проверить логи
pm2 logs vcurse
```

### Проблема 3: Файлы не загружаются

**Причина:** Google Cloud Storage не настроен или нет прав

**Решение:**
```bash
# Проверить что файл credentials существует
ls -la /home/vcurse/vcurse-app/gcs-credentials.json

# Проверить переменную окружения
cat .env | grep GOOGLE_APPLICATION_CREDENTIALS

# Проверить логи на ошибки GCS
pm2 logs vcurse | grep -i storage
```

### Проблема 4: SSL сертификат не обновляется

**Причина:** Certbot не может подключиться к серверу

**Решение:**
```bash
# Проверить статус certbot
sudo systemctl status certbot.timer

# Попробовать обновить вручную
sudo certbot renew --nginx

# Проверить логи
sudo cat /var/log/letsencrypt/letsencrypt.log
```

### Проблема 5: Высокое использование памяти

**Причина:** Утечка памяти или слишком много процессов

**Решение:**
```bash
# Проверить использование памяти
free -h

# Перезапустить приложение
pm2 restart vcurse

# Уменьшить max_memory_restart в ecosystem.config.js
nano ecosystem.config.js
# Измените max_memory_restart: '500M'

# Перезапустить PM2
pm2 delete vcurse
pm2 start ecosystem.config.js --env production
```

### Проблема 6: "Permission denied" при записи логов

**Причина:** Нет прав на директорию logs

**Решение:**
```bash
cd /home/vcurse/vcurse-app

# Создать директорию и дать права
mkdir -p logs
chmod 755 logs

# Перезапустить приложение
pm2 restart vcurse
```

---

## 🎯 Обновление приложения

Когда вы вносите изменения в код на Replit и хотите обновить на сервере:

### Шаг 1: Остановить приложение

```bash
cd /home/vcurse/vcurse-app
pm2 stop vcurse
```

### Шаг 2: Обновить код

**Если используете Git:**
```bash
git pull origin main
```

**Если используете ZIP:**
```bash
# Скачайте новый ZIP с Replit
# Скопируйте на сервер
# Распакуйте
```

### Шаг 3: Установить новые зависимости (если добавились)

```bash
npm install
```

### Шаг 4: Применить миграции БД (если были изменения в схеме)

```bash
npm run db:push
```

### Шаг 5: Пересобрать приложение

```bash
npm run build
```

### Шаг 6: Запустить приложение

```bash
pm2 restart vcurse

# Проверить логи
pm2 logs vcurse
```

---

## 📝 Чеклист развёртывания

Используйте этот чеклист чтобы убедиться что всё настроено:

### Базовая инфраструктура
- [ ] Сервер обновлён (`sudo apt update && sudo apt upgrade`)
- [ ] PostgreSQL 16 установлен и запущен
- [ ] База данных `vcurse_db` создана
- [ ] Пользователь `vcurse_user` создан с правами
- [ ] Данные импортированы из Replit
- [ ] Node.js 20 установлен
- [ ] PM2 установлен глобально
- [ ] Nginx установлен и запущен

### Код приложения
- [ ] Код приложения скопирован на сервер
- [ ] Файл `server/db.ts` изменён для работы с обычным PostgreSQL
- [ ] Зависимости установлены (`npm install`)
- [ ] Файл `.env` создан со всеми переменными
- [ ] Приложение собрано (`npm run build`)

### Telegram бот
- [ ] Бот создан через @BotFather
- [ ] Токен бота получен
- [ ] `TELEGRAM_BOT_TOKEN` добавлен в `.env`
- [ ] Изображение `bot_welcome_logo.png` скопировано
- [ ] Бот отвечает на `/start` команду
- [ ] Код привязки работает на сайте
- [ ] 2FA работает при входе с привязанным Telegram
- [ ] Уведомления приходят в Telegram

### Развёртывание и безопасность
- [ ] PM2 запущен и настроен автозапуск
- [ ] Nginx настроен как reverse proxy
- [ ] SSL сертификат получен от Let's Encrypt
- [ ] Файрволл настроен (UFW)
- [ ] Автоматические бэкапы настроены (cron)

### Тестирование
- [ ] Сайт открывается по HTTPS
- [ ] Регистрация и вход работают
- [ ] Покупка курсов работает
- [ ] Telegram уведомления приходят
- [ ] Все основные функции протестированы

---

## 🆘 Получение помощи

Если возникли проблемы:

1. **Проверьте логи:**
   - PM2: `pm2 logs vcurse`
   - Nginx: `sudo tail -f /var/log/nginx/vcurse_error.log`
   - PostgreSQL: `sudo tail -f /var/log/postgresql/postgresql-16-main.log`

2. **Проверьте статусы сервисов:**
   ```bash
   sudo systemctl status postgresql
   sudo systemctl status nginx
   pm2 status
   ```

3. **Соберите информацию:**
   - Версия ОС: `lsb_release -a`
   - Версия Node.js: `node --version`
   - Версия PostgreSQL: `psql --version`
   - Свободное место: `df -h`
   - Память: `free -h`

---

## 🎓 Итоги

Поздравляю! 🎉 Вы развернули полноценное веб-приложение на собственном сервере!

**Что вы получили:**
- ✅ Производительный Debian сервер
- ✅ PostgreSQL база данных с автобэкапами
- ✅ Node.js приложение работающее через PM2
- ✅ Nginx как reverse proxy
- ✅ SSL сертификат (HTTPS)
- ✅ Защищённый сервер (UFW)
- ✅ Автоматические бэкапы
- ✅ Полный контроль над инфраструктурой

**Что дальше:**
- Настройте мониторинг (например, Uptime Robot)
- Настройте алерты при падении сервера
- Оптимизируйте производительность PostgreSQL
- Добавьте CDN для статических файлов
- Настройте CI/CD для автоматического деплоя

**Удачи! 🚀**

---

*Документ создан: 7 ноября 2025*  
*Версия: 1.0*
