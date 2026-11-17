# Sistema de Paz y Salvo y Liquidación

Aplicación académica para gestionar el paz y salvo y la liquidación laboral.

## Docker

```bash
docker compose up --build
```

Abrir: http://localhost:8080

## Sin Docker

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

Abrir: http://localhost:4200  
El proxy de Angular reenvía `/api` a `http://localhost:3000`.

## Stack

- Backend: Node 20, Express, TypeORM, better-sqlite3, Zod, decimal.js, pdfmake
- Frontend: Angular 21 (standalone), Bootstrap 5, bootstrap-icons
