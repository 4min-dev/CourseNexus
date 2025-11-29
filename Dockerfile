# ========== BASE ==========
FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build


# ========== RUNTIME (production) ==========
FROM node:20-alpine AS runtime

# УСТАНАВЛИВАЕМ FFMPEG + FFPROBE
RUN apk add --no-cache ffmpeg

WORKDIR /app
ENV NODE_ENV=production

# Копируем только нужное
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Копируем собранный код
COPY --from=base /app/dist ./dist

# Порт
EXPOSE 5002
ENV PORT=5002

# Запуск
CMD ["npm", "start"]


# ========== DEV ==========
FROM node:20-alpine AS dev

# И здесь тоже ставим ffmpeg (чтобы локально в dev-контейнере работало)
RUN apk add --no-cache ffmpeg

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

COPY . .

EXPOSE 5002
CMD ["npm", "run", "dev"]