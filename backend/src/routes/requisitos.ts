import { Router } from 'express';
import { z } from 'zod';
import { AppDataSource } from '../data-source';
import { Expediente } from '../entities/Expediente';
import { Requisito } from '../entities/Requisito';
import { badRequest, forbidden, notFound } from '../errors';
import { asyncHandler } from '../middleware';

const router = Router();
const repo = () => AppDataSource.getRepository(Requisito);
const expRepo = () => AppDataSource.getRepository(Expediente);

const patchSchema = z.object({
  estado: z.enum(['Pendiente', 'Aprobado', 'Rechazado']),
  responsable: z.string().min(1, 'Responsable es obligatorio'),
  observacion: z.string().optional().nullable(),
});

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const requisito = await repo().findOne({
      where: { id: Number(req.params.id) },
      relations: ['expediente'],
    });
    if (!requisito) throw notFound('Requisito no encontrado');

    const expediente =
      requisito.expediente ||
      (await expRepo().findOne({ where: { id: requisito.expedienteId } }));
    if (!expediente) throw notFound('Expediente no encontrado');
    if (expediente.estado === 'Finalizado') {
      throw forbidden('Expediente finalizado: solo lectura');
    }

    const data = patchSchema.parse(req.body);
    if (data.estado === 'Rechazado' && !data.observacion?.trim()) {
      throw badRequest('Observación obligatoria al rechazar');
    }

    requisito.estado = data.estado;
    requisito.responsable = data.responsable;
    requisito.observacion = data.observacion ?? null;
    requisito.fechaRevision = new Date();

    const saved = await repo().save(requisito);
    res.json(saved);
  }),
);

export default router;
