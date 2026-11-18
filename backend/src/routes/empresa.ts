import { Router } from 'express';
import { z } from 'zod';
import { AppDataSource } from '../data-source';
import { Empresa } from '../entities/Empresa';
import { notFound } from '../errors';
import { asyncHandler } from '../middleware';

const router = Router();
const repo = () => AppDataSource.getRepository(Empresa);

const empresaSchema = z.object({
  razonSocial: z.string().min(1),
  ruc: z.string().min(1),
  direccion: z.string().min(1),
  representante: z.string().min(1),
  ciudad: z.string().trim().optional().nullable(),
  elaboradoNombre: z.string().trim().optional().nullable(),
  elaboradoCargo: z.string().trim().optional().nullable(),
  revisadoNombre: z.string().trim().optional().nullable(),
  revisadoCargo: z.string().trim().optional().nullable(),
  aprobadoNombre: z.string().trim().optional().nullable(),
  aprobadoCargo: z.string().trim().optional().nullable(),
});

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const empresa = await repo().findOne({ where: {}, order: { id: 'ASC' } });
    if (!empresa) throw notFound('Empresa no configurada');
    res.json(empresa);
  }),
);

router.put(
  '/',
  asyncHandler(async (req, res) => {
    const data = empresaSchema.parse(req.body);
    let empresa = await repo().findOne({ where: {}, order: { id: 'ASC' } });
    if (!empresa) {
      empresa = repo().create(data);
    } else {
      Object.assign(empresa, data);
    }
    const saved = await repo().save(empresa);
    res.json(saved);
  }),
);

export default router;
