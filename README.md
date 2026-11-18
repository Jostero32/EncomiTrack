# Sistema de Paz y Salvo y Liquidación

Aplicación para gestionar el paz y salvo y la liquidación laboral (EncomiTrack).
Se publica bajo la subruta **`/liquidacion`**: la app en `/liquidacion/` y la API
en `/liquidacion/api/`.

## Docker (local, igual que producción)

```bash
docker compose up --build
```

- App: <http://localhost:8080/liquidacion/> (`/` redirige ahí)
- API: <http://localhost:8080/liquidacion/api/health>
- Datos: carpeta `./data` (base SQLite `app.db` y archivos en `uploads/`)

Para servir en la raíz, ponga `BASE_PATH: ""` en los dos servicios de
`docker-compose.yml` (y en el `args` del frontend).

## Despliegue en Dokploy (dos aplicaciones con Dockerfile)

Igual que el sistema de nómina: la ruta se configura **sin "Strip Path"**, porque
cada contenedor ya atiende las rutas con el prefijo `/liquidacion`.

### 1. Backend (API)

| Campo | Valor |
|---|---|
| Build type | Dockerfile |
| Docker file | `backend/Dockerfile` |
| Docker context path | `backend` |
| Variables de entorno | `BASE_PATH=/liquidacion` (ya es el valor por defecto) |
| Volumen | Montar un volumen persistente en `/data` (base `app.db` y `uploads/`) |
| Dominio | `su-dominio.com`, **Path `/liquidacion/api`**, puerto `3000`, Strip Path **desactivado** |

Comprobar: `https://su-dominio.com/liquidacion/api/health` → `{"ok":true}`

### 2. Frontend

| Campo | Valor |
|---|---|
| Build type | Dockerfile |
| Docker file | `frontend/Dockerfile` |
| Docker context path | `frontend` |
| Build args | `BASE_PATH=/liquidacion` (ya es el valor por defecto) |
| Dominio | `su-dominio.com`, **Path `/liquidacion`**, puerto `80`, Strip Path **desactivado** |

Traefik envía `/liquidacion/api/...` al backend (ruta más específica) y el resto
de `/liquidacion/...` al frontend. Comprobar: `https://su-dominio.com/liquidacion/`.

**Alternativa (un solo dominio para el frontend):** si prefiere no publicar el
backend en el dominio, deje solo el dominio del frontend y defina en él
`BACKEND_URL=http://<nombre-interno-del-backend>:3000`. El nginx del frontend
reenvía `/liquidacion/api` a esa dirección (deben estar en la misma red de Docker,
p. ej. `dokploy-network`).

### Notas

- Si cambia la subruta, use el mismo valor en `BASE_PATH` del backend, en el
  build arg del frontend y en los Path de los dominios.
- El tamaño máximo de archivos subidos es 10 MB.
- La fuente Inter se carga desde Google Fonts; sin internet se usa la del sistema.

## Sin Docker (desarrollo)

Backend:

```bash
cd backend
npm i
npm run dev
```

Frontend (otra terminal):

```bash
cd frontend
npm i
npm start
```

Abrir: <http://localhost:4200>
En desarrollo la app vive en la raíz y el proxy de Angular reenvía `/api` a
`http://localhost:3000`.

## Stack

- Backend: Node 20, Express, TypeORM, better-sqlite3, Zod, decimal.js, pdfmake
- Frontend: Angular 21 (standalone), Bootstrap 5, bootstrap-icons
