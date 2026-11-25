import { Router } from 'express';
import { In } from 'typeorm';
import { z } from 'zod';
import { calcularLiquidacion } from '../calculos';
import { AppDataSource } from '../data-source';
import { Expediente } from '../entities/Expediente';
import {
  EntradasLiquidacion,
  Liquidacion,
} from '../entities/Liquidacion';
import { ESTADOS_DEUDA_VIGENTE, Obligacion } from '../entities/Obligacion';
import { badRequest, conflict, forbidden, notFound } from '../errors';
import { asyncHandler } from '../middleware';
import { obtenerVacaciones } from '../vacaciones';

const router = Router({ mergeParams: true });

const expRepo = () => AppDataSource.getRepository(Expediente);
const lRepo = () => AppDataSource.getRepository(Liquidacion);

const manualItemSchema = z.object({
  concepto: z.string().min(1),
  valor: z.union([z.string(), z.number()]),
  justificacion: z.string().min(1, 'Justificación obligatoria'),
});

const entradasSchema = z.object({
  /** Si se omite (o es null) se usa el saldo de períodos completos de vacaciones. */
  diasVacacionesPendientesAnteriores: z.number().min(0).optional().nullable(),
  justificacionDiasVacaciones: z.string().optional().nullable(),
  observaciones: z.string().optional().nullable(),
  otrosHaberes: z.array(manualItemSchema).optional().default([]),
  anticipos: z.array(manualItemSchema).optional().default([]),
  otrasDeducciones: z.array(manualItemSchema).optional().default([]),
});

async function getExpediente(id: number): Promise<Expediente> {
  const expediente = await expRepo().findOne({
    where: { id },
    relations: ['trabajador', 'liquidacion'],
  });
  if (!expediente) throw notFound('Expediente no encontrado');
  return expediente;
}

function assertNotFinalizado(expediente: Expediente): void {
  if (expediente.estado === 'Finalizado') {
    throw forbidden('Expediente finalizado: solo lectura');
  }
}

function assertNotConfirmada(liquidacion: Liquidacion | null | undefined): void {
  if (liquidacion?.confirmada) {
    throw badRequest('La liquidación ya está confirmada');
  }
}

/**
 * Completa las entradas con el saldo de vacaciones calculado y valida que,
 * si el usuario lo edita, exista una justificación.
 */
async function prepararEntradas(
  expediente: Expediente,
  body: unknown,
): Promise<EntradasLiquidacion> {
  const parsed = entradasSchema.parse(body ?? {});
  const vacaciones = await obtenerVacaciones(
    expediente.trabajadorId,
    expediente.fechaIngreso,
    expediente.fechaSalida,
  );
  const calculados = vacaciones.saldoPeriodosCompletos;
  const diasGozadosPeriodoEnCurso =
    vacaciones.periodos.find((p) => !p.completo)?.diasGozados ?? 0;
  const editado =
    parsed.diasVacacionesPendientesAnteriores !== undefined &&
    parsed.diasVacacionesPendientesAnteriores !== null &&
    parsed.diasVacacionesPendientesAnteriores !== calculados;
  const justificacion = parsed.justificacionDiasVacaciones?.trim() || null;
  if (editado && !justificacion) {
    throw badRequest(
      `Justifique el cambio de días de vacaciones pendientes (saldo calculado: ${calculados})`,
    );
  }
  return {
    ...parsed,
    diasVacacionesCalculados: calculados,
    diasGozadosPeriodoEnCurso,
    diasVacacionesPendientesAnteriores: editado
      ? (parsed.diasVacacionesPendientesAnteriores as number)
      : calculados,
    justificacionDiasVacaciones: editado ? justificacion : null,
    observaciones: parsed.observaciones?.trim() || null,
  };
}

async function obligacionesPendientes(trabajadorId: number) {
  const obligaciones = await AppDataSource.getRepository(Obligacion).find({
    where: { trabajadorId, estado: In([...ESTADOS_DEUDA_VIGENTE]) },
    order: { fecha: 'ASC', id: 'ASC' },
  });
  return obligaciones.map((o) => ({
    referenciaId: o.id,
    concepto: o.concepto,
    valor: o.valor,
    justificacion: o.justificacion?.trim() || `${o.tipo} pendiente (${o.fecha})`,
  }));
}

async function buildResult(
  expediente: Expediente,
  entradas: EntradasLiquidacion,
) {
  return calcularLiquidacion({
    remuneracion: expediente.remuneracion,
    fechaIngreso: expediente.fechaIngreso,
    fechaSalida: expediente.fechaSalida,
    causa: expediente.causa,
    region: expediente.region,
    decimosMensualizados: expediente.decimosMensualizados,
    diasVacacionesPendientesAnteriores:
      entradas.diasVacacionesPendientesAnteriores ?? 0,
    diasGozadosPeriodoEnCurso: entradas.diasGozadosPeriodoEnCurso ?? 0,
    fondosReservaMensualizados: expediente.fondosReservaMensualizados,
    otrosHaberes: entradas.otrosHaberes,
    anticipos: entradas.anticipos,
    otrasDeducciones: entradas.otrasDeducciones,
    obligaciones: await obligacionesPendientes(expediente.trabajadorId),
  });
}

router.post(
  '/calcular',
  asyncHandler(async (req, res) => {
    const expediente = await getExpediente(Number(req.params.id));
    assertNotFinalizado(expediente);

    let liquidacion = await lRepo().findOne({
      where: { expedienteId: expediente.id },
    });
    assertNotConfirmada(liquidacion);

    const entradas = await prepararEntradas(expediente, req.body);
    const resultado = await buildResult(expediente, entradas);

    if (!liquidacion) {
      liquidacion = lRepo().create({
        expedienteId: expediente.id,
        entradas,
        rubros: resultado.rubros,
        totalHaberes: resultado.totalHaberes,
        totalDeducciones: resultado.totalDeducciones,
        neto: resultado.neto,
        observaciones: entradas.observaciones ?? null,
        confirmada: false,
        fechaConfirmacion: null,
        desactualizada: false,
      });
    } else {
      liquidacion.desactualizada = false;
      liquidacion.entradas = entradas;
      liquidacion.observaciones = entradas.observaciones ?? null;
      liquidacion.rubros = resultado.rubros;
      liquidacion.totalHaberes = resultado.totalHaberes;
      liquidacion.totalDeducciones = resultado.totalDeducciones;
      liquidacion.neto = resultado.neto;
    }

    const saved = await lRepo().save(liquidacion);
    res.json(saved);
  }),
);

router.put(
  '/',
  asyncHandler(async (req, res) => {
    const expediente = await getExpediente(Number(req.params.id));
    assertNotFinalizado(expediente);

    let liquidacion = await lRepo().findOne({
      where: { expedienteId: expediente.id },
    });
    if (!liquidacion) throw notFound('Liquidación no encontrada');
    assertNotConfirmada(liquidacion);

    const entradas = await prepararEntradas(expediente, req.body);
    const resultado = await buildResult(expediente, entradas);

    liquidacion.desactualizada = false;
    liquidacion.entradas = entradas;
    liquidacion.observaciones = entradas.observaciones ?? null;
    liquidacion.rubros = resultado.rubros;
    liquidacion.totalHaberes = resultado.totalHaberes;
    liquidacion.totalDeducciones = resultado.totalDeducciones;
    liquidacion.neto = resultado.neto;

    const saved = await lRepo().save(liquidacion);
    res.json(saved);
  }),
);

router.post(
  '/confirmar',
  asyncHandler(async (req, res) => {
    const expediente = await getExpediente(Number(req.params.id));
    assertNotFinalizado(expediente);

    const liquidacion = await lRepo().findOne({
      where: { expedienteId: expediente.id },
    });
    if (!liquidacion) throw notFound('Liquidación no encontrada');
    if (liquidacion.confirmada) {
      throw badRequest('La liquidación ya está confirmada');
    }
    if (liquidacion.desactualizada) {
      throw conflict(
        'La liquidación está desactualizada (cambiaron deudas, vacaciones o datos del trabajador): recalcúlela antes de confirmar',
      );
    }

    liquidacion.confirmada = true;
    liquidacion.fechaConfirmacion = new Date();
    const saved = await lRepo().save(liquidacion);
    res.json(saved);
  }),
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    await getExpediente(Number(req.params.id));
    const liquidacion = await lRepo().findOne({
      where: { expedienteId: Number(req.params.id) },
    });
    if (!liquidacion) throw notFound('Liquidación no encontrada');
    res.json(liquidacion);
  }),
);

export default router;
