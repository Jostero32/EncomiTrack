import { Router } from 'express';
import { z } from 'zod';
import { AppDataSource } from '../data-source';
import { Expediente } from '../entities/Expediente';
import { Requisito } from '../entities/Requisito';
import { forbidden, notFound } from '../errors';
import { asyncHandler } from '../middleware';
import { aplicarRespuesta } from '../paz-salvo-db';

const router = Router();
const repo = () => AppDataSource.getRepository(Requisito);
const expRepo = () => AppDataSource.getRepository(Expediente);

const patchSchema = z.object({
  respuesta: z.enum(['SI', 'NO', 'N/A']).nullable(),
  /** Opcional: el responsable se registra al certificar el área. */
  responsable: z.string().trim().optional().nullable(),
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
    if (expediente.estado !== 'En proceso') {
      throw forbidden(
        expediente.estado === 'Finalizado'
          ? 'Expediente finalizado: solo lectura'
          : 'El paz y salvo ya fue aprobado',
      );
    }

    const data = patchSchema.parse(req.body);
    await AppDataSource.transaction((manager) =>
      aplicarRespuesta(manager, requisito, data),
    );

    const { expediente: _omit, ...saved } = requisito;
    res.json(saved);
  }),
);

export default router;
