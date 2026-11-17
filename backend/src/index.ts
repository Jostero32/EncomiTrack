import 'reflect-metadata';
import cors from 'cors';
import express from 'express';
import { AppDataSource } from './data-source';
import { errorHandler } from './middleware';
import dashboardRouter from './routes/dashboard';
import demoRouter from './routes/demo';
import documentosRouter from './routes/documentos';
import empresaRouter from './routes/empresa';
import expedientesRouter from './routes/expedientes';
import liquidacionRouter from './routes/liquidacion';
import requisitosRouter from './routes/requisitos';
import trabajadoresRouter from './routes/trabajadores';

async function main() {
  await AppDataSource.initialize();

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/api/empresa', empresaRouter);
  app.use('/api/trabajadores', trabajadoresRouter);
  app.use('/api/expedientes', expedientesRouter);
  app.use('/api/expedientes/:id/liquidacion', liquidacionRouter);
  app.use('/api/expedientes/:id/pdf', documentosRouter);
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
