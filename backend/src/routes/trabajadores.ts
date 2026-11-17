import { Router } from 'express';
import { Like } from 'typeorm';
import { z } from 'zod';
import { AppDataSource } from '../data-source';
import { Expediente } from '../entities/Expediente';
import { Trabajador } from '../entities/Trabajador';
import { conflict, notFound } from '../errors';
import { asyncHandler } from '../middleware';

const router = Router();
const repo = () => AppDataSource.getRepository(Trabajador);
const expRepo = () => AppDataSource.getRepository(Expediente);

const trabajadorSchema = z.object({
  cedula: z.string().min(1),
  nombres: z.string().min(1),
  apellidos: z.string().min(1),
  cargo: z.string().min(1),
  departamento: z.string().min(1),
  fechaIngreso: z.string().min(1),
  remuneracion: z.union([z.string(), z.number()]),
  estado: z.enum(['Activo', 'Finalizado']).optional().default('Activo'),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!q) {
      res.json(await repo().find({ order: { id: 'DESC' } }));
      return;
    }
    const trabajadores = await repo().find({
      where: [
        { cedula: Like(`%${q}%`) },
        { nombres: Like(`%${q}%`) },
        { apellidos: Like(`%${q}%`) },
      ],
      order: { id: 'DESC' },
    });
    res.json(trabajadores);
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const trabajador = await repo().findOne({
      where: { id: Number(req.params.id) },
    });
    if (!trabajador) throw notFound('Trabajador no encontrado');
    res.json(trabajador);
  }),
);

router.get(
  '/:id/expedientes',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const trabajador = await repo().findOne({ where: { id } });
    if (!trabajador) throw notFound('Trabajador no encontrado');
    const expedientes = await expRepo().find({
      where: { trabajadorId: id },
      order: { id: 'DESC' },
    });
    res.json(expedientes);
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = trabajadorSchema.parse(req.body);
    const existing = await repo().findOne({ where: { cedula: data.cedula } });
    if (existing) throw conflict('Cédula duplicada');
    const trabajador = repo().create({
      ...data,
      remuneracion: String(data.remuneracion),
      estado: data.estado ?? 'Activo',
    });
    const saved = await repo().save(trabajador);
    res.status(201).json(saved);
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const trabajador = await repo().findOne({
      where: { id: Number(req.params.id) },
    });
    if (!trabajador) throw notFound('Trabajador no encontrado');
    const data = trabajadorSchema.partial().parse(req.body);
    if (data.cedula && data.cedula !== trabajador.cedula) {
      const dup = await repo().findOne({ where: { cedula: data.cedula } });
      if (dup) throw conflict('Cédula duplicada');
    }
    Object.assign(trabajador, {
      ...data,
      remuneracion:
        data.remuneracion !== undefined
          ? String(data.remuneracion)
          : trabajador.remuneracion,
    });
    const saved = await repo().save(trabajador);
    res.json(saved);
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const trabajador = await repo().findOne({
      where: { id: Number(req.params.id) },
    });
    if (!trabajador) throw notFound('Trabajador no encontrado');
    await repo().remove(trabajador);
    res.status(204).send();
  }),
);

export default router;
