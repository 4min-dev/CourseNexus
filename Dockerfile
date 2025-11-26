# Stage: base (сборка)
FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci          # устанавливаем все зависимости для сборки

COPY . .
RUN npm run build

# Stage: runtime (production)
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev   # только prod зависимости

COPY --from=base /app/dist ./dist

EXPOSE 5002
ENV PORT=5002

CMD ["npm", "start"]

# Stage: dev (для development)
FROM node:20-alpine AS dev
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install           # ставим все, включая devDependencies
COPY . .
EXPOSE 5002
CMD ["npm", "run", "dev"]
