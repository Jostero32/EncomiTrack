import { Router } from 'express';
import { In, Not } from 'typeorm';
import { z } from 'zod';
import { AppDataSource } from '../data-source';
import { SBU } from '../calculos';
import { AprobacionDepartamento } from '../entities/AprobacionDepartamento';
import { Expediente } from '../entities/Expediente';
import { Liquidacion } from '../entities/Liquidacion';
import { ESTADOS_DEUDA_VIGENTE, Obligacion } from '../entities/Obligacion';
import { Requisito } from '../entities/Requisito';
import { Trabajador } from '../entities/Trabajador';
import {
  badRequest,
  conflict,
  forbidden,
  notFound,
} from '../errors';
import { asyncHandler } from '../middleware';
import { ordenarAreas, rangoArea } from '../paz-salvo';
import {
  aplicarRespuesta,
  conteoEvidencias,
  crearRequisitos,
  detallesRequisitos,
  regenerarRequisitos,
} from '../paz-salvo-db';
import { generarYGuardarPdfsSistema } from '../pdf-sistema';
import { remuneracionSchema } from '../validaciones';

const router = Router();

const expRepo = () => AppDataSource.getRepository(Expediente);
const tRepo = () => AppDataSource.getRepository(Trabajador);
const rRepo = () => AppDataSource.getRepository(Requisito);
const lRepo = () => AppDataSource.getRepository(Liquidacion);
const aRepo = () => AppDataSource.getRepository(AprobacionDepartamento);

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
  fondosReservaMensualizados: z.boolean().optional().default(false),
  observaciones: z.string().optional().nullable(),
  responsable: z.string().optional().nullable(),
});

const updateSchema = createSchema.partial().omit({ trabajadorId: true }).extend({
  fechaIngreso: z.string().optional(),
  cargo: z.string().optional(),
  remuneracion: remuneracionSchema.optional(),
});

const aprobarAreaSchema = z.object({
  responsable: z.string().trim().min(3, 'Responsable del área es obligatorio'),
  cargo: z.string().trim().optional().nullable(),
  observacion: z.string().trim().optional().nullable(),
});

async function nextNumero(): Promise<string> {
  const last = await expRepo().find({
    order: { id: 'DESC' },
    take: 1,
  });
  const next = (last[0]?.id ?? 0) + 1;
  return `EXP-${String(next).padStart(4, '0')}`;
}

const FULL_RELATIONS = ['trabajador', 'requisitos', 'liquidacion', 'aprobaciones'];
const ORDEN_REQUISITOS = { requisitos: { orden: 'ASC' as const, id: 'ASC' as const } };

async function findFull(id: number): Promise<Expediente | null> {
  return expRepo().findOne({
    where: { id },
    relations: FULL_RELATIONS,
    order: ORDEN_REQUISITOS,
  });
}

/**
 * Expediente con los requisitos ordenados por área (ORDEN_AREAS), el detalle del
 * bien u obligación de origen, el número de evidencias y la lista de áreas.
 */
async function findVista(id: number) {
  const expediente = await findFull(id);
  if (!expediente) return null;
  const manager = AppDataSource.manager;
  const requisitos = [...(expediente.requisitos ?? [])].sort(
    (a, b) =>
      rangoArea(a.departamento) - rangoArea(b.departamento) ||
      a.departamento.localeCompare(b.departamento, 'es') ||
      a.orden - b.orden ||
      a.id - b.id,
  );
  const [detalles, evidencias] = await Promise.all([
    detallesRequisitos(manager, requisitos),
    conteoEvidencias(manager, requisitos.map((r) => r.id)),
  ]);
  return {
    ...expediente,
    requisitos: requisitos.map((r) => ({
      ...r,
      detalle: detalles.get(r.id) ?? null,
      evidencias: evidencias.get(r.id) ?? 0,
    })),
    areas: ordenarAreas(requisitos.map((r) => r.departamento)),
  };
}

function assertEnProceso(expediente: Expediente): void {
  if (expediente.estado !== 'En proceso') {
    throw forbidden(
      expediente.estado === 'Finalizado'
        ? 'Expediente finalizado: solo lectura'
        : 'El paz y salvo ya fue aprobado',
    );
  }
}

async function getExpediente(id: number): Promise<Expediente> {
  const expediente = await expRepo().findOne({ where: { id } });
  if (!expediente) throw notFound('Expediente no encontrado');
  return expediente;
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
    const expediente = await findVista(Number(req.params.id));
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
    if (Number(trabajador.remuneracion) < SBU) {
      throw badRequest(
        `La remuneración del trabajador ($${trabajador.remuneracion}) es menor al SBU ($${SBU}); corríjala antes de iniciar la salida`,
      );
    }

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
      fondosReservaMensualizados: data.fondosReservaMensualizados,
      cargo: trabajador.cargo,
      remuneracion: trabajador.remuneracion,
      observaciones: data.observaciones ?? null,
      responsable: data.responsable ?? null,
      estado: 'En proceso',
    });

    const saved = await AppDataSource.transaction(async (manager) => {
      const exp = await manager.save(expediente);
      await crearRequisitos(manager, exp.id, trabajador.id);
      return exp;
    });

    res.status(201).json(await findVista(saved.id));
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
    const liq = await lRepo().findOne({ where: { expedienteId: expediente.id } });
    if (liq?.confirmada) {
      throw conflict('La liquidación ya está confirmada: no se pueden cambiar los datos de la salida');
    }
    if (liq) await lRepo().update({ id: liq.id }, { desactualizada: true });

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
  '/:id/regenerar-requisitos',
  asyncHandler(async (req, res) => {
    const expediente = await getExpediente(Number(req.params.id));
    if (expediente.estado !== 'En proceso') {
      throw forbidden('Solo se pueden regenerar requisitos de un expediente En proceso');
    }
    const resumen = await AppDataSource.transaction((manager) =>
      regenerarRequisitos(manager, expediente.id, expediente.trabajadorId),
    );
    res.json({ ...resumen, expediente: await findVista(expediente.id) });
  }),
);

/** Responde con la respuesta esperada todos los ítems pendientes del área. */
router.post(
  '/:id/departamentos/:departamento/marcar-esperado',
  asyncHandler(async (req, res) => {
    const expediente = await getExpediente(Number(req.params.id));
    assertEnProceso(expediente);
    const departamento = req.params.departamento;
    const responsable =
      typeof req.body?.responsable === 'string' ? req.body.responsable : null;

    await AppDataSource.transaction(async (manager) => {
      const pendientes = await manager.find(Requisito, {
        where: { expedienteId: expediente.id, departamento },
      });
      for (const r of pendientes.filter((x) => x.respuesta === null)) {
        await aplicarRespuesta(manager, r, {
          respuesta: r.respuestaEsperada,
          responsable,
          observacion: r.observacion,
        });
      }
    });
    res.json(await findVista(expediente.id));
  }),
);

router.post(
  '/:id/departamentos/:departamento/aprobar',
  asyncHandler(async (req, res) => {
    const expediente = await getExpediente(Number(req.params.id));
    if (expediente.estado === 'Finalizado') {
      throw forbidden('Expediente finalizado: solo lectura');
    }
    if (expediente.estado !== 'En proceso') {
      throw forbidden('El paz y salvo ya fue aprobado');
    }
    const departamento = req.params.departamento;
    const data = aprobarAreaSchema.parse(req.body ?? {});

    const requisitos = await rRepo().find({
      where: { expedienteId: expediente.id, departamento },
    });
    if (requisitos.length === 0) throw notFound(`El área ${departamento} no tiene requisitos`);
    const sinCumplir = requisitos.filter((r) => !r.cumple);
    if (sinCumplir.length > 0) {
      throw conflict(
        `El área ${departamento} tiene ${sinCumplir.length} requisito(s) sin cumplir`,
      );
    }
    if (await aRepo().findOne({ where: { expedienteId: expediente.id, departamento } })) {
      throw conflict(`El área ${departamento} ya está certificada`);
    }

    await AppDataSource.transaction(async (manager) => {
      await manager.save(
        manager.create(AprobacionDepartamento, {
          expedienteId: expediente.id,
          departamento,
          responsable: data.responsable,
          cargo: data.cargo || null,
          observacion: data.observacion || null,
          fecha: new Date(),
        }),
      );
      const sinResponsable = requisitos.filter((r) => !r.responsable?.trim());
      for (const r of sinResponsable) r.responsable = data.responsable;
      if (sinResponsable.length) await manager.save(sinResponsable);
    });
    res.status(201).json(await findVista(expediente.id));
  }),
);

router.delete(
  '/:id/departamentos/:departamento/aprobar',
  asyncHandler(async (req, res) => {
    const expediente = await getExpediente(Number(req.params.id));
    assertEnProceso(expediente);
    const aprobacion = await aRepo().findOne({
      where: { expedienteId: expediente.id, departamento: req.params.departamento },
    });
    if (!aprobacion) throw notFound('El área no está certificada');
    await aRepo().remove(aprobacion);
    res.json(await findVista(expediente.id));
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
    const pendientes = requisitos.filter((r) => !r.cumple);
    if (requisitos.length === 0 || pendientes.length > 0) {
      throw badRequest(
        `Todos los requisitos deben cumplir para aprobar el paz y salvo (${pendientes.length} sin cumplir)`,
      );
    }
    const certificadas = new Set(
      (await aRepo().find({ where: { expedienteId: expediente.id } })).map(
        (a) => a.departamento,
      ),
    );
    const sinCertificar = ordenarAreas(requisitos.map((r) => r.departamento)).filter(
      (d) => !certificadas.has(d),
    );
    if (sinCertificar.length > 0) {
      throw conflict(`Faltan áreas por certificar: ${sinCertificar.join(', ')}`);
    }

    expediente.estado = 'Paz y salvo aprobado';
    const saved = await expRepo().save(expediente);
    res.json(saved);
  }),
);

/** Vuelve el paz y salvo a "En proceso" (solo si la liquidación no está confirmada). */
router.post(
  '/:id/reabrir-paz-salvo',
  asyncHandler(async (req, res) => {
    const expediente = await getExpediente(Number(req.params.id));
    if (expediente.estado !== 'Paz y salvo aprobado') {
      throw badRequest('Solo se puede reabrir un paz y salvo aprobado');
    }
    const liq = await lRepo().findOne({ where: { expedienteId: expediente.id } });
    if (liq?.confirmada) {
      throw conflict('La liquidación ya está confirmada: no se puede reabrir el paz y salvo');
    }
    expediente.estado = 'En proceso';
    await expRepo().save(expediente);
    res.json(await findVista(expediente.id));
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

    // Asegura trabajador cargado para los PDF institucionales.
    if (!expediente.trabajador) {
      const trabajador = await tRepo().findOne({
        where: { id: expediente.trabajadorId },
      });
      if (!trabajador) throw notFound('Trabajador no encontrado');
      expediente.trabajador = trabajador;
    }

    await generarYGuardarPdfsSistema(expediente, liquidacion);

    expediente.estado = 'Finalizado';
    await expRepo().save(expediente);

    // Solo quedan Pagadas las deudas que se descontaron en la liquidación confirmada;
    // las registradas después siguen pendientes.
    const descontadas = (liquidacion.rubros ?? [])
      .filter((r) => r.origen === 'obligacion' && typeof r.referenciaId === 'number')
      .map((r) => r.referenciaId as number);
    if (descontadas.length) {
      await AppDataSource.getRepository(Obligacion).update(
        {
          id: In(descontadas),
          trabajadorId: expediente.trabajadorId,
          estado: In([...ESTADOS_DEUDA_VIGENTE]),
        },
        { estado: 'Pagada' },
      );
    }

    expediente.trabajador.estado = 'Finalizado';
    await tRepo().save(expediente.trabajador);

    res.json(await findFull(expediente.id));
  }),
);

export default router;
