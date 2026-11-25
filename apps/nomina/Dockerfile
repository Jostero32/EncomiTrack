# syntax=docker/dockerfile:1

# Sistema de Roles de Pago · imagen de producción (Next.js + SQLite).
# Debian (glibc) en lugar de Alpine: better-sqlite3 y sharp usan binarios precompilados.
ARG NODE_VERSION=22
# Ruta pública de la app (basePath de Next). Se publica en https://dominio/nominas;
# en el proxy (Dokploy/Traefik) configure el path /nominas SIN "strip path".
# Use --build-arg BASE_PATH= para servirla en la raíz.
ARG BASE_PATH=/nominas

# ---------------------------------------------------------------- Dependencias
FROM node:${NODE_VERSION}-bookworm-slim AS deps
WORKDIR /app
# Respaldo por si better-sqlite3 no encuentra un binario precompilado y debe compilarse.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------------- Build
FROM node:${NODE_VERSION}-bookworm-slim AS builder
ARG BASE_PATH
WORKDIR /app
# El prefijo queda incrustado en el build (rutas, assets y código del navegador).
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_BASE_PATH=${BASE_PATH}
COPY --from=deps /app/node_modules ./node_modules
# Rutas explícitas: no se copian node_modules, .next ni la base de datos local.
COPY package.json package-lock.json next.config.ts tsconfig.json postcss.config.mjs ./
COPY public ./public
COPY scripts ./scripts
# Si el script se editó en Windows (CRLF), sh no lo ejecutaría.
RUN sed -i 's/\r$//' scripts/iniciar-contenedor.sh
COPY src ./src
RUN npm run build \
    && rm -rf .next/cache data

# ---------------------------------------------------------------- Ejecución
FROM node:${NODE_VERSION}-bookworm-slim AS runner
ARG BASE_PATH
WORKDIR /app
# tzdata: los periodos ("mes en curso") se calculan con la hora local de Ecuador.
RUN apt-get update \
    && apt-get install -y --no-install-recommends tzdata \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    TZ=America/Guayaquil \
    NEXT_PUBLIC_BASE_PATH=${BASE_PATH} \
    CARGAR_DATOS_EJEMPLO=1
# Se conservan todas las dependencias (incluye tsx) para poder ejecutar
# `npm run db:seed` dentro del contenedor.
COPY --from=builder /app ./
RUN mkdir -p data && chown node:node data
USER node

# data/nomina.db (SQLite) debe persistir fuera del contenedor.
VOLUME ["/app/data"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000' + (process.env.NEXT_PUBLIC_BASE_PATH || '') + '/api/empresa/logo').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Si la base del volumen está vacía, carga los datos de ejemplo (empresa,
# parámetros, organigrama, novedades y un rol); nunca reemplaza datos existentes.
# Para no cargarlos: CARGAR_DATOS_EJEMPLO=0. Ver líneas "[inicio]" en los logs.
CMD ["sh", "scripts/iniciar-contenedor.sh"]
