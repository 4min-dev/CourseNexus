# ========== BASE ==========
FROM node:22-alpine AS base

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    fontconfig \
    ffmpeg \
    cpulimit \
    && rm -rf /var/cache/apk/* /tmp/*

RUN addgroup -S pptruser && adduser -S -G pptruser pptruser \
    && mkdir -p /home/pptruser/Downloads /app \
    && chown -R pptruser:pptruser /home/pptruser /app

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_ENV=production

WORKDIR /app

# ========== BUILDER ==========
FROM base AS builder

USER pptruser

COPY --chown=pptruser:pptruser package.json package-lock.json ./
RUN npm ci --include=dev

COPY --chown=pptruser:pptruser . .
RUN npm run build

# ========== DEV ==========
FROM builder AS dev

USER pptruser

ENV NODE_ENV=development

EXPOSE 5000
CMD ["npm", "run", "dev"]

# ========== PRODUCTION ==========
FROM base AS production

USER pptruser

COPY --chown=pptruser:pptruser package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder --chown=pptruser:pptruser /app/dist ./dist
COPY --from=builder --chown=pptruser:pptruser /app/attached_assets ./attached_assets

ENV NODE_ENV=production \
    PORT=5002

EXPOSE 5002
CMD ["npm", "start"]
