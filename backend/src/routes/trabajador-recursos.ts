import { Router } from 'express';
import { Not } from 'typeorm';
import { z } from 'zod';
import { AppDataSource } from '../data-source';
import {
  BienAsignado,
  DEPARTAMENTOS_RESPONSABLES,
  ESTADOS_BIEN,
  TIPOS_BIEN,
} from '../entities/BienAsignado';
import { Expediente } from '../entities/Expediente';
import {
  ESTADOS_OBLIGACION,
  Obligacion,
  TIPOS_OBLIGACION,
} from '../entities/Obligacion';
import { Trabajador } from '../entities/Trabajador';
import { VacacionGozada } from '../entities/VacacionGozada';
import { badRequest, notFound } from '../errors';
import { asyncHandler } from '../middleware';
import {
  assertLiquidacionAbierta,
  assertPazSalvoEditable,
  expedienteAbierto,
  marcarLiquidacionDesactualizada,
  sincronizarBien,
  sincronizarObligacion,
} from '../sync-expediente';
import { obtenerVacaciones } from '../vacaciones';

/** Respuesta con el aviso de lo que cambió en el expediente abierto (si aplica). */
function conAviso<T extends object>(entidad: T, aviso: string | null) {
  return aviso ? { ...entidad, avisoExpediente: aviso } : entidad;
}

/**
 * Recursos del expediente del trabajador:
 *   /api/trabajadores/:id/bienes, /obligaciones, /vacaciones
 */
const router = Router({ mergeParams: true });

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (AAAA-MM-DD)');
const textoOpcional = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v?.trim() ? v.trim() : null));

const bienSchema = z.object({
  tipo: z.enum(TIPOS_BIEN),
  descripcion: z.string().trim().min(1, 'Descripción es obligatoria'),
  codigoSerie: textoOpcional,
  departamentoResponsable: z.enum(DEPARTAMENTOS_RESPONSABLES),
  fechaAsignacion: fecha.optional().nullable(),
  estado: z.enum(ESTADOS_BIEN).default('Asignado'),
  fechaDevolucion: fecha.optional().nullable(),
  observacion: textoOpcional,
});

const obligacionSchema = z.object({
  tipo: z.enum(TIPOS_OBLIGACION),
  concepto: z.string().trim().min(1, 'Concepto es obligatorio'),
  valor: z.coerce.number().positive('El valor debe ser mayor a 0'),
  fecha,
  estado: z.enum(ESTADOS_OBLIGACION).default('Pendiente'),
  justificacion: textoOpcional,
});

const vacacionSchema = z.object({
  fechaInicio: fecha,
  dias: z.coerce.number().int().positive('Los días deben ser mayores a 0'),
  documento: textoOpcional,
  observacion: textoOpcional,
});

async function getTrabajador(id: unknown): Promise<Trabajador> {
  const trabajador = await AppDataSource.getRepository(Trabajador).findOne({
    where: { id: Number(id) },
  });
  if (!trabajador) throw notFound('Trabajador no encontrado');
  return trabajador;
}

function normalizarBien(data: z.infer<typeof bienSchema>) {
  return {
    ...data,
    fechaAsignacion: data.fechaAsignacion || null,
    fechaDevolucion:
      data.estado === 'Devuelto' ? data.fechaDevolucion || hoy() : null,
  };
}

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---------- Bienes y accesos ----------
const bRepo = () => AppDataSource.getRepository(BienAsignado);

router.get(
  '/bienes',
  asyncHandler(async (req, res) => {
    const t = await getTrabajador(req.params.id);
    res.json(await bRepo().find({ where: { trabajadorId: t.id }, order: { id: 'ASC' } }));
  }),
);

router.post(
  '/bienes',
  asyncHandler(async (req, res) => {
    const t = await getTrabajador(req.params.id);
    const data = normalizarBien(bienSchema.parse(req.body));
    const out = await AppDataSource.transaction(async (m) => {
      const exp = await expedienteAbierto(m, t.id);
      assertPazSalvoEditable(exp, 'los bienes');
      const bien = await m.save(m.create(BienAsignado, { ...data, trabajadorId: t.id }));
      return conAviso(bien, await sincronizarBien(m, exp, bien, 'crear'));
    });
    res.status(201).json(out);
  }),
);

router.put(
  '/bienes/:itemId',
  asyncHandler(async (req, res) => {
    const t = await getTrabajador(req.params.id);
    const bien = await bRepo().findOne({
      where: { id: Number(req.params.itemId), trabajadorId: t.id },
    });
    if (!bien) throw notFound('Bien no encontrado');
    const data = normalizarBien(bienSchema.parse(req.body));
    const out = await AppDataSource.transaction(async (m) => {
      const exp = await expedienteAbierto(m, t.id);
      assertPazSalvoEditable(exp, 'los bienes');
      Object.assign(bien, data);
      const saved = await m.save(bien);
      return conAviso(saved, await sincronizarBien(m, exp, saved, 'editar'));
    });
    res.json(out);
  }),
);

router.delete(
  '/bienes/:itemId',
  asyncHandler(async (req, res) => {
    const t = await getTrabajador(req.params.id);
    const bien = await bRepo().findOne({
      where: { id: Number(req.params.itemId), trabajadorId: t.id },
    });
    if (!bien) throw notFound('Bien no encontrado');
    const out = await AppDataSource.transaction(async (m) => {
      const exp = await expedienteAbierto(m, t.id);
      assertPazSalvoEditable(exp, 'los bienes');
      const aviso = await sincronizarBien(m, exp, bien, 'eliminar');
      await m.remove(bien);
      return conAviso({ ok: true }, aviso);
    });
    res.json(out);
  }),
);

// ---------- Obligaciones ----------
const oRepo = () => AppDataSource.getRepository(Obligacion);

router.get(
  '/obligaciones',
  asyncHandler(async (req, res) => {
    const t = await getTrabajador(req.params.id);
    res.json(
      await oRepo().find({
        where: { trabajadorId: t.id },
        order: { fecha: 'ASC', id: 'ASC' },
      }),
    );
  }),
);

router.post(
  '/obligaciones',
  asyncHandler(async (req, res) => {
    const t = await getTrabajador(req.params.id);
    const data = obligacionSchema.parse(req.body);
    const out = await AppDataSource.transaction(async (m) => {
      const exp = await expedienteAbierto(m, t.id);
      assertPazSalvoEditable(exp, 'las deudas');
      assertLiquidacionAbierta(exp, 'las deudas');
      const o = await m.save(
        m.create(Obligacion, { ...data, valor: data.valor.toFixed(2), trabajadorId: t.id }),
      );
      return conAviso(o, await sincronizarObligacion(m, exp, o, 'crear'));
    });
    res.status(201).json(out);
  }),
);

router.put(
  '/obligaciones/:itemId',
  asyncHandler(async (req, res) => {
    const t = await getTrabajador(req.params.id);
    const obligacion = await oRepo().findOne({
      where: { id: Number(req.params.itemId), trabajadorId: t.id },
    });
    if (!obligacion) throw notFound('Obligación no encontrada');
    const data = obligacionSchema.parse(req.body);
    const out = await AppDataSource.transaction(async (m) => {
      const exp = await expedienteAbierto(m, t.id);
      assertPazSalvoEditable(exp, 'las deudas');
      assertLiquidacionAbierta(exp, 'las deudas');
      Object.assign(obligacion, { ...data, valor: data.valor.toFixed(2) });
      const saved = await m.save(obligacion);
      return conAviso(saved, await sincronizarObligacion(m, exp, saved, 'editar'));
    });
    res.json(out);
  }),
);

router.delete(
  '/obligaciones/:itemId',
  asyncHandler(async (req, res) => {
    const t = await getTrabajador(req.params.id);
    const obligacion = await oRepo().findOne({
      where: { id: Number(req.params.itemId), trabajadorId: t.id },
    });
    if (!obligacion) throw notFound('Obligación no encontrada');
    const out = await AppDataSource.transaction(async (m) => {
      const exp = await expedienteAbierto(m, t.id);
      assertPazSalvoEditable(exp, 'las deudas');
      assertLiquidacionAbierta(exp, 'las deudas');
      const aviso = await sincronizarObligacion(m, exp, obligacion, 'eliminar');
      await m.remove(obligacion);
      return conAviso({ ok: true }, aviso);
    });
    res.json(out);
  }),
);

// ---------- Vacaciones ----------
const vRepo = () => AppDataSource.getRepository(VacacionGozada);

/**
 * Períodos de vacaciones con saldo. Fecha de corte: ?fechaCorte, o la fecha de
 * salida del expediente abierto, o hoy.
 */
router.get(
  '/vacaciones',
  asyncHandler(async (req, res) => {
    const t = await getTrabajador(req.params.id);
    let fechaCorte =
      typeof req.query.fechaCorte === 'string' ? req.query.fechaCorte : '';
    if (fechaCorte && !fecha.safeParse(fechaCorte).success) {
      throw badRequest('fechaCorte inválida (AAAA-MM-DD)');
    }
    if (!fechaCorte) {
      const abierto = await AppDataSource.getRepository(Expediente).findOne({
        where: { trabajadorId: t.id, estado: Not('Finalizado' as const) },
        order: { id: 'DESC' },
      });
      fechaCorte = abierto?.fechaSalida ?? hoy();
    }
    res.json(await obtenerVacaciones(t.id, t.fechaIngreso, fechaCorte));
  }),
);

router.post(
  '/vacaciones',
  asyncHandler(async (req, res) => {
    const t = await getTrabajador(req.params.id);
    const data = vacacionSchema.parse(req.body);
    const out = await AppDataSource.transaction(async (m) => {
      const exp = await expedienteAbierto(m, t.id);
      assertLiquidacionAbierta(exp, 'las vacaciones');
      const v = await m.save(m.create(VacacionGozada, { ...data, trabajadorId: t.id }));
      return conAviso(v, await marcarLiquidacionDesactualizada(m, exp));
    });
    res.status(201).json(out);
  }),
);

router.put(
  '/vacaciones/:itemId',
  asyncHandler(async (req, res) => {
    const t = await getTrabajador(req.params.id);
    const vacacion = await vRepo().findOne({
      where: { id: Number(req.params.itemId), trabajadorId: t.id },
    });
    if (!vacacion) throw notFound('Registro de vacaciones no encontrado');
    const data = vacacionSchema.parse(req.body);
    const out = await AppDataSource.transaction(async (m) => {
      const exp = await expedienteAbierto(m, t.id);
      assertLiquidacionAbierta(exp, 'las vacaciones');
      Object.assign(vacacion, data);
      const saved = await m.save(vacacion);
      return conAviso(saved, await marcarLiquidacionDesactualizada(m, exp));
    });
    res.json(out);
  }),
);

router.delete(
  '/vacaciones/:itemId',
  asyncHandler(async (req, res) => {
    const t = await getTrabajador(req.params.id);
    const vacacion = await vRepo().findOne({
      where: { id: Number(req.params.itemId), trabajadorId: t.id },
    });
    if (!vacacion) throw notFound('Registro de vacaciones no encontrado');
    const out = await AppDataSource.transaction(async (m) => {
      const exp = await expedienteAbierto(m, t.id);
      assertLiquidacionAbierta(exp, 'las vacaciones');
      await m.remove(vacacion);
      return conAviso({ ok: true }, await marcarLiquidacionDesactualizada(m, exp));
    });
    res.json(out);
  }),
);

export default router;
