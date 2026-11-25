# Documentación

- `img/`: capturas usadas en el README principal y en el portafolio.
- `capturas.json`: qué pantallas se capturan (URL y botones a pulsar).
- `capturar.mjs`: script que las genera con Chrome en modo headless.

## Regenerar las capturas

Con la suite levantada (`docker compose up -d --build`) y el caso demo de liquidación cargado:

```bash
curl -X POST http://localhost:8080/liquidacion/api/demo/cargar   # solo la primera vez
npm install --no-save playwright-core@1.49.1                      # usa el Chrome instalado
node docs/capturar.mjs docs/capturas.json docs/img
```
