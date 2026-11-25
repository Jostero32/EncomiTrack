import { Router } from 'express';
import { AppDataSource } from '../data-source';
import { Expediente } from '../entities/Expediente';
import { Trabajador } from '../entities/Trabajador';
import { asyncHandler } from '../middleware';

const router = Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const tRepo = AppDataSource.getRepository(Trabajador);
    const eRepo = AppDataSource.getRepository(Expediente);

    const [
      totalTrabajadores,
      activos,
      totalExpedientes,
      enProceso,
      pazSalvoPendientes,
      finalizados,
      ultimos5,
    ] = await Promise.all([
      tRepo.count(),
      tRepo.count({ where: { estado: 'Activo' } }),
      eRepo.count(),
      eRepo.count({ where: { estado: 'En proceso' } }),
      eRepo.count({ where: { estado: 'En proceso' } }),
      eRepo.count({ where: { estado: 'Finalizado' } }),
      eRepo.find({
        order: { createdAt: 'DESC' },
        take: 5,
        relations: ['trabajador'],
      }),
    ]);

    res.json({
      totalTrabajadores,
      activos,
      totalExpedientes,
      enProceso,
      pazSalvoPendientes,
      finalizados,
      ultimos5,
    });
  }),
);

export default router;
