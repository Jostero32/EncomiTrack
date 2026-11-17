import { Router } from 'express';
import { Not } from 'typeorm';
import { z } from 'zod';
import { AppDataSource } from '../data-source';
import { Expediente } from '../entities/Expediente';
import { Liquidacion } from '../entities/Liquidacion';
import { Requisito } from '../entities/Requisito';
import { Trabajador } from '../entities/Trabajador';
import {
  badRequest,
  conflict,
  forbidden,
  notFound,
} from '../errors';
import { asyncHandler } from '../middleware';
import { REQUISITOS_DEFAULT } from '../requisitos-default';

const router = Router();

const expRepo = () => AppDataSource.getRepository(Expediente);
const tRepo = () => AppDataSource.getRepository(Trabajador);
const rRepo = () => AppDataSource.getRepository(Requisito);
const lRepo = () => AppDataSource.getRepository(Liquidacion);

const createSchema = z.object({
  trabajadorId: z.number().int().positive(),
  fechaSalida: z.string().min(1),
  causa: z.enum([
    'Renuncia voluntaria',
    'Desahucio',
    'Despido intempestivo',
    'Mutuo acuerdo',
    'Fin de contrato',
  ]),
  region: z.enum(['Sierra-Amazonía', 'Costa-Galápagos']),
  decimosMensualizados: z.boolean(),
  observaciones: z.string().optional().nullable(),
  responsable: z.string().optional().nullable(),
});

const updateSchema = createSchema.partial().omit({ trabajadorId: true }).extend({
  fechaIngreso: z.string().optional(),
  cargo: z.string().optional(),
  remuneracion: z.union([z.string(), z.number()]).optional(),
});

async function nextNumero(): Promise<string> {
  const last = await expRepo().find({
    order: { id: 'DESC' },
    take: 1,
  });
  const next = (last[0]?.id ?? 0) + 1;
  return `EXP-${String(next).padStart(4, '0')}`;
}

async function assertEditable(expediente: Expediente): Promise<void> {
  if (expediente.estado === 'Finalizado') {
    throw forbidden('Expediente finalizado: solo lectura');
  }
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const estado =
      typeof req.query.estado === 'string' ? req.query.estado.trim() : '';

    const qb = expRepo()
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.trabajador', 't')
      .orderBy('e.id', 'DESC');

    if (estado) {
      qb.andWhere('e.estado = :estado', { estado });
    }
    if (q) {
      qb.andWhere(
        '(e.numero LIKE :q OR t.cedula LIKE :q OR t.nombres LIKE :q OR t.apellidos LIKE :q)',
        { q: `%${q}%` },
      );
    }

    res.json(await qb.getMany());
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const expediente = await expRepo().findOne({
      where: { id: Number(req.params.id) },
      relations: ['trabajador', 'requisitos', 'liquidacion'],
    });
    if (!expediente) throw notFound('Expediente no encontrado');
    res.json(expediente);
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const trabajador = await tRepo().findOne({
      where: { id: data.trabajadorId },
    });
    if (!trabajador) throw notFound('Trabajador no encontrado');

    const abierto = await expRepo().findOne({
      where: {
        trabajadorId: trabajador.id,
        estado: Not('Finalizado' as const),
      },
    });
    if (abierto) {
      throw conflict(
        'El trabajador ya tiene un expediente que no está finalizado',
      );
    }

    const expediente = expRepo().create({
      numero: await nextNumero(),
      trabajador,
      trabajadorId: trabajador.id,
      fechaIngreso: trabajador.fechaIngreso,
      fechaSalida: data.fechaSalida,
      causa: data.causa,
      region: data.region,
      decimosMensualizados: data.decimosMensualizados,
      cargo: trabajador.cargo,
      remuneracion: trabajador.remuneracion,
      observaciones: data.observaciones ?? null,
      responsable: data.responsable ?? null,
      estado: 'En proceso',
    });

    const saved = await expRepo().save(expediente);

    const requisitos = REQUISITOS_DEFAULT.map((r) =>
      rRepo().create({
        expedienteId: saved.id,
        departamento: r.departamento,
        descripcion: r.descripcion,
        estado: 'Pendiente',
        responsable: null,
        fechaRevision: null,
        observacion: null,
      }),
    );
    await rRepo().save(requisitos);

    const full = await expRepo().findOne({
      where: { id: saved.id },
      relations: ['trabajador', 'requisitos', 'liquidacion'],
    });
    res.status(201).json(full);
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const expediente = await expRepo().findOne({
      where: { id: Number(req.params.id) },
    });
    if (!expediente) throw notFound('Expediente no encontrado');
    await assertEditable(expediente);

    const data = updateSchema.parse(req.body);
    Object.assign(expediente, {
      ...data,
      remuneracion:
        data.remuneracion !== undefined
          ? String(data.remuneracion)
          : expediente.remuneracion,
    });
    const saved = await expRepo().save(expediente);
    res.json(saved);
  }),
);

router.post(
  '/:id/aprobar-paz-salvo',
  asyncHandler(async (req, res) => {
    const expediente = await expRepo().findOne({
      where: { id: Number(req.params.id) },
      relations: ['requisitos'],
    });
    if (!expediente) throw notFound('Expediente no encontrado');
    await assertEditable(expediente);

    const requisitos = expediente.requisitos ?? [];
    if (
      requisitos.length === 0 ||
      requisitos.some((r) => r.estado !== 'Aprobado')
    ) {
      throw badRequest(
        'Todos los requisitos deben estar Aprobados para el paz y salvo',
      );
    }

    expediente.estado = 'Paz y salvo aprobado';
    const saved = await expRepo().save(expediente);
    res.json(saved);
  }),
);

router.post(
  '/:id/finalizar',
  asyncHandler(async (req, res) => {
    const expediente = await expRepo().findOne({
      where: { id: Number(req.params.id) },
      relations: ['liquidacion', 'trabajador'],
    });
    if (!expediente) throw notFound('Expediente no encontrado');
    if (expediente.estado === 'Finalizado') {
      throw badRequest('El expediente ya está finalizado');
    }
    if (expediente.estado !== 'Paz y salvo aprobado') {
      throw badRequest('Se requiere paz y salvo aprobado');
    }

    const liquidacion =
      expediente.liquidacion ||
      (await lRepo().findOne({ where: { expedienteId: expediente.id } }));
    if (!liquidacion?.confirmada) {
      throw badRequest('Se requiere liquidación confirmada');
    }

    expediente.estado = 'Finalizado';
    await expRepo().save(expediente);

    const trabajador =
      expediente.trabajador ||
      (await tRepo().findOne({ where: { id: expediente.trabajadorId } }));
    if (trabajador) {
      trabajador.estado = 'Finalizado';
      await tRepo().save(trabajador);
    }

    const full = await expRepo().findOne({
      where: { id: expediente.id },
      relations: ['trabajador', 'requisitos', 'liquidacion'],
    });
    res.json(full);
  }),
);

export default router;
