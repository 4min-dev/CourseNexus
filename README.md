**Overview**
- Fullstack app: Express + Vite React + Drizzle ORM.
- Dev runs a single Node process that mounts Vite middleware.
- Prod builds client to `dist/public` and bundles the server to `dist/index.js`.

**Requirements**
- Node.js 20+
- npm 10+
- Environment:
  - `DATABASE_URL` (Postgres)
  - `DB_DRIVER` — `neon` (по умолчанию) или `pg` для локального Postgres
- `PORT` (default `5000`).
- Telegram (optional but enabled by default): `TELEGRAM_BOT_TOKEN`, `VITE_TELEGRAM_BOT_USERNAME`.
- Object storage (Bunny Storage): `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR`, `BUNNY_STORAGE_ZONE`, `BUNNY_STORAGE_API_KEY`, optional `BUNNY_STORAGE_HOST` (по умолчанию `storage.bunnycdn.com`) и `BUNNY_STORAGE_API_HOST` для явного указания API-хоста хранилища.
- CDN (Bunny Pull Zone для статики и медиаконтента): `BUNNY_CDN_URL` — публичный Pull Zone/чистый домен Bunny (например, `https://cdn.example.com`).
- Видео: для уроков, загруженных в Bunny Stream или через встроенный Bunny storage, укажите embed URL (`https://iframe.mediadelivery.net/embed/...`) — клиент автоматически использует встроенный Bunny-плеер с трекингом прогресса.

**Local Development**
- Copy env and fill values: `cp .env.sample .env` (update `DATABASE_URL` and `DB_DRIVER` for your Postgres instance).
- Для object storage укажите пути в Bunny Storage (`PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR`) и креды `BUNNY_STORAGE_ZONE` + `BUNNY_STORAGE_API_KEY`. В docker-compose dev используются значения по умолчанию `/dev-bucket/public` и `/dev-bucket/private`, их можно переопределить через `.env`.
- Install deps: `npm ci`
- Run dev server: `npm run dev`
  - Serves API and client on `http://localhost:5000`.

**Production (without Docker)**
- Build: `npm run build`
- Start: `npm start`

**Docker**
- Prod (blue/green on one host): `docker compose -f docker-compose.prod.yml up -d --build`
  - Поднимает `app_blue` (127.0.0.1:5001) и `app_green` (127.0.0.1:5002) параллельно текущему прод-инстансу.
  - Использует существующую docker-сеть/БД (по умолчанию `coursenexus_default`).
  - Для zero-downtime переключения используйте `./scripts/deploy-bluegreen.sh`.
  - Детали: `docs/deploy/BLUE_GREEN.md`.
- Dev (локальный Postgres в Compose): `docker compose -f docker-compose.yml up`
  - Поднимает Postgres (db service) и пробрасывает `DATABASE_URL=postgresql://coursenexus:coursenexus@db:5432/coursenexus`.
  - App запускается с `npm run dev`, код монтируется из хоста.
  - После первого старта выполните `npm run db:push` (внутри контейнера или на хосте) чтобы прогнать миграции в dev-базу.

**Common Env Vars**
- `DATABASE_URL`: e.g. Neon connection string.
- `PORT`: e.g. `5000`.
- `TELEGRAM_BOT_TOKEN`, `VITE_TELEGRAM_BOT_USERNAME`: needed for Telegram bot features.
- `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR`: required for object storage-backed media routes.

**Database Migrations**
- Drizzle config uses `DATABASE_URL`. To push schema:
- `npm run db:push`
