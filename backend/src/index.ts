import 'reflect-metadata';
import cors from 'cors';
import express from 'express';
import { AppDataSource } from './data-source';
import { errorHandler } from './middleware';
import archivosRouter from './routes/archivos';
import dashboardRouter from './routes/dashboard';
import demoRouter from './routes/demo';
import documentosRouter from './routes/documentos';
import empresaRouter from './routes/empresa';
import expedienteDocumentosRouter from './routes/expediente-documentos';
import expedientesRouter from './routes/expedientes';
import liquidacionRouter from './routes/liquidacion';
import plantillaRouter from './routes/plantilla';
import requisitosRouter from './routes/requisitos';
import trabajadorRecursosRouter from './routes/trabajador-recursos';
import trabajadoresRouter from './routes/trabajadores';
import { seedPlantilla } from './requisitos-default';
import { ensureUploadsRoot } from './upload';

async function main() {
  await AppDataSource.initialize();
  await seedPlantilla();
  ensureUploadsRoot();

  const app = express();
  app.use(cors());
  app.use(express.json());

  const api = express.Router();
  api.get('/health', (_req, res) => {
    res.json({ ok: true });
  });
  api.use('/empresa', empresaRouter);
  api.use('/trabajadores', trabajadoresRouter);
  api.use('/trabajadores/:id', trabajadorRecursosRouter);
  api.use('/plantilla-requisitos', plantillaRouter);
  api.use('/expedientes/:id/documentos', expedienteDocumentosRouter);
  api.use('/expedientes', expedientesRouter);
  api.use('/expedientes/:id/liquidacion', liquidacionRouter);
  api.use('/expedientes/:id/pdf', documentosRouter);
  api.use('/documentos', archivosRouter);
  api.use('/requisitos', requisitosRouter);
  api.use('/dashboard', dashboardRouter);
  api.use('/demo', demoRouter);

  // Prefijo de publicación (p. ej. /liquidacion en Dokploy, sin "strip path").
  // La API responde en <BASE_PATH>/api y también en /api (desarrollo local y
  // proxies que quitan el prefijo).
  const basePath = (process.env.BASE_PATH ?? '').replace(/\/+$/, '');
  app.use(basePath ? [`${basePath}/api`, '/api'] : '/api', api);

  app.use(errorHandler);

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`API escuchando en puerto ${port} (ruta ${basePath || ''}/api)`);
  });
}

main().catch((err) => {
  console.error('No se pudo iniciar la aplicación', err);
  process.exit(1);
});
