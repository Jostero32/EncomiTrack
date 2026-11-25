import { Router } from 'express';
import { z } from 'zod';
import { AppDataSource } from '../data-source';
import { PlantillaRequisito } from '../entities/PlantillaRequisito';
import { notFound } from '../errors';
import { asyncHandler } from '../middleware';

/** Plantilla de requisitos del paz y salvo (editable en Configuración). */
const router = Router();
const repo = () => AppDataSource.getRepository(PlantillaRequisito);

const schema = z.object({
  departamento: z.string().trim().min(1, 'Departamento es obligatorio'),
  pregunta: z.string().trim().min(5, 'La pregunta debe tener al menos 5 caracteres'),
  respuestaEsperada: z.enum(['SI', 'NO']),
  orden: z.coerce.number().int().min(0).default(0),
});

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(await repo().find({ order: { orden: 'ASC', id: 'ASC' } }));
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = schema.parse(req.body);
    res.status(201).json(await repo().save(repo().create(data)));
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const item = await repo().findOne({ where: { id: Number(req.params.id) } });
    if (!item) throw notFound('Pregunta de plantilla no encontrada');
    Object.assign(item, schema.parse(req.body));
    res.json(await repo().save(item));
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const item = await repo().findOne({ where: { id: Number(req.params.id) } });
    if (!item) throw notFound('Pregunta de plantilla no encontrada');
    await repo().remove(item);
    res.status(204).send();
  }),
);

export default router;
