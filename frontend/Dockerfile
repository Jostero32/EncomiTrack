# syntax=docker/dockerfile:1

# Frontend (Angular) servido por nginx bajo una subruta.
# Se publica en https://dominio/liquidacion/. En Dokploy configure el path
# /liquidacion SIN "strip path". Para servirlo en la raíz: --build-arg BASE_PATH=
ARG BASE_PATH=/liquidacion

FROM node:20 AS build
ARG BASE_PATH
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# El prefijo queda en <base href>: rutas, assets y llamadas a la API son relativas a él.
RUN npx ng build --configuration production --base-href "${BASE_PATH%/}/"

FROM nginx:1.27-alpine
ARG BASE_PATH

# BACKEND_URL: dónde está la API para el proxy interno de nginx (docker compose o
# misma red de Docker). Si el dominio enruta <BASE_PATH>/api directo al backend
# (dos aplicaciones en Dokploy), este proxy no se usa.
ENV BASE_PATH=${BASE_PATH} \
    BACKEND_URL=http://backend:3000

COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html${BASE_PATH}
COPY nginx-config.sh /docker-entrypoint.d/40-config-subruta.sh
# Si el script se editó en Windows (CRLF), sh no lo ejecutaría.
RUN sed -i 's/\r$//' /docker-entrypoint.d/40-config-subruta.sh \
    && chmod +x /docker-entrypoint.d/40-config-subruta.sh \
    && rm -f /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null "http://127.0.0.1${BASE_PATH%/}/" || exit 1
