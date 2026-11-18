# syntax=docker/dockerfile:1

# API de Paz y Salvo y Liquidación (Express + TypeORM + SQLite).
# Se publica en https://dominio/liquidacion/api. En Dokploy configure el path
# /liquidacion/api SIN "strip path". Para servirla en la raíz: BASE_PATH= (vacío).

FROM node:20-slim AS build

# Respaldo por si better-sqlite3 debe compilarse.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:20-slim

# tzdata: fechas con la hora local de Ecuador.
RUN apt-get update \
    && apt-get install -y --no-install-recommends tzdata \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production \
    TZ=America/Guayaquil \
    BASE_PATH=/liquidacion \
    DB_PATH=/data/app.db \
    UPLOADS_DIR=/data/uploads \
    PORT=3000

COPY package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

RUN mkdir -p /data/uploads

# La base SQLite y los archivos subidos deben persistir fuera del contenedor.
VOLUME ["/data"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + (process.env.BASE_PATH || '') + '/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/index.js"]
