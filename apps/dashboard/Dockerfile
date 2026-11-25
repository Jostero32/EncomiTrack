# syntax=docker/dockerfile:1.7
# ─────────────────────────────────────────────────────────────────────────────
# Portal académico · Emprendimiento y Legislación Laboral (FISEI · UTA)
# Multi-stage: deps → build → runtime (Next.js standalone)
# ─────────────────────────────────────────────────────────────────────────────

ARG NODE_VERSION=22-alpine

# 1) Dependencias
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
# "canvas" es una dependencia opcional de pdf.js que no se usa en el navegador
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund --ignore-scripts

# 2) Build
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
# Ruta pública (basePath de Next). Se compila en la imagen; "" = raíz del dominio.
ARG BASE_PATH=/emprendimiento-dashboard
ENV NEXT_TELEMETRY_DISABLED=1 \
    BASE_PATH=${BASE_PATH}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 3) Runtime mínimo
FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ARG BASE_PATH=/emprendimiento-dashboard
ENV NODE_ENV=production \
    BASE_PATH=${BASE_PATH} \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DOCS_ROOT=/data/docs \
    DATA_DIR=/data/app

# /data/docs: material del semestre (Primer_Parcial/, Seundo_Parcial/), solo lectura.
# /data/app:  documents.json + uploads/ de lo que se sube desde la interfaz.
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs \
 && mkdir -p /data/docs /data/app/uploads && chown -R nextjs:nodejs /data

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
VOLUME ["/data/app"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:3000${BASE_PATH}" >/dev/null 2>&1 || exit 1

CMD ["node", "server.js"]
