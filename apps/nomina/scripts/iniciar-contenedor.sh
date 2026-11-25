#!/bin/sh
# Arranque del contenedor: carga los datos de ejemplo si la base está vacía y
# luego inicia Next.js. Cada paso deja una línea "[inicio]" en los logs.
set -u

echo "[inicio] Base de datos: /app/data/nomina.db"

if ! touch data/.prueba-escritura 2>/dev/null; then
  echo "[inicio] ERROR: /app/data no permite escritura al usuario node (uid 1000)." >&2
  echo "[inicio] Revise el volumen montado en /app/data (permisos del host)." >&2
else
  rm -f data/.prueba-escritura
fi

case "${CARGAR_DATOS_EJEMPLO:-1}" in
  0 | false | FALSE | False | no | NO | No)
    echo "[inicio] CARGAR_DATOS_EJEMPLO=${CARGAR_DATOS_EJEMPLO}: no se cargan datos de ejemplo."
    ;;
  *)
    echo "[inicio] Verificando si hay que cargar datos de ejemplo..."
    if ! node_modules/.bin/tsx scripts/db-seed.ts --si-vacia; then
      echo "[inicio] ERROR al cargar los datos de ejemplo (ver el mensaje anterior). La app inicia igual." >&2
    fi
    ;;
esac

echo "[inicio] Iniciando la app en el puerto ${PORT:-3000}, ruta ${NEXT_PUBLIC_BASE_PATH:-/}"
exec node node_modules/next/dist/bin/next start -H 0.0.0.0
