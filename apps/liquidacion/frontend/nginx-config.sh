#!/bin/sh
# Genera la configuración de nginx para servir la app bajo BASE_PATH
# (p. ej. /liquidacion) y reenviar BASE_PATH/api al backend (BACKEND_URL).
# Se ejecuta al iniciar el contenedor (docker-entrypoint.d de la imagen nginx).
set -e

BASE="${BASE_PATH%/}"
PUERTO="${LISTEN_PORT:-8080}"
BACKEND="${BACKEND_URL:-http://backend:3000}"
BACKEND="${BACKEND%/}"

REDIRECCIONES=""
if [ -n "$BASE" ]; then
  REDIRECCIONES="
    location = / { return 302 $BASE/; }
    location = $BASE { return 301 $BASE/; }"
fi

cat > /etc/nginx/conf.d/default.conf <<EOF
server {
    listen $PUERTO;
    server_name _;
    root /usr/share/nginx/html;

    # Redirecciones relativas: conservan el esquema (https) y el puerto del proxy.
    absolute_redirect off;

    # DNS interno de Docker: el backend se resuelve al momento de la petición,
    # así nginx arranca aunque el backend no esté (o esté en otra aplicación).
    resolver 127.0.0.11 valid=30s ipv6=off;

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;

    # Subida de evidencias (máx. 10 MB en el backend).
    client_max_body_size 12m;
$REDIRECCIONES

    location $BASE/api/ {
        set \$backend "$BACKEND";
        # Sin URI en proxy_pass: se reenvía la ruta completa ($BASE/api/...).
        proxy_pass \$backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }

    # Archivos con hash en el nombre: caché larga.
    location ~* ^$BASE/.+\.(js|css|woff2?|ttf|svg|png|jpg|ico)\$ {
        try_files \$uri =404;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # SPA: cualquier ruta de Angular devuelve index.html (sin caché).
    location $BASE/ {
        try_files \$uri \$uri/ $BASE/index.html;
        add_header Cache-Control "no-cache";
    }
}
EOF

echo "[subruta] nginx en :$PUERTO${BASE:-/} · API -> $BACKEND"
