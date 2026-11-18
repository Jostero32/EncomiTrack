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

  app.use('/api/empresa', empresaRouter);
  app.use('/api/trabajadores', trabajadoresRouter);
  app.use('/api/trabajadores/:id', trabajadorRecursosRouter);
  app.use('/api/plantilla-requisitos', plantillaRouter);
  app.use('/api/expedientes/:id/documentos', expedienteDocumentosRouter);
  app.use('/api/expedientes', expedientesRouter);
  app.use('/api/expedientes/:id/liquidacion', liquidacionRouter);
  app.use('/api/expedientes/:id/pdf', documentosRouter);
  app.use('/api/documentos', archivosRouter);
  app.use('/api/requisitos', requisitosRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/demo', demoRouter);

  app.use(errorHandler);

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`API escuchando en puerto ${port}`);
  });
}

main().catch((err) => {
  console.error('No se pudo iniciar la aplicación', err);
  process.exit(1);
});
