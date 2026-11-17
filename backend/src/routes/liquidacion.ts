import { Router } from 'express';
import { z } from 'zod';
import { calcularLiquidacion } from '../calculos';
import { AppDataSource } from '../data-source';
import { Expediente } from '../entities/Expediente';
import {
  EntradasLiquidacion,
  Liquidacion,
} from '../entities/Liquidacion';
import { badRequest, forbidden, notFound } from '../errors';
import { asyncHandler } from '../middleware';

const router = Router({ mergeParams: true });

const expRepo = () => AppDataSource.getRepository(Expediente);
const lRepo = () => AppDataSource.getRepository(Liquidacion);

const manualItemSchema = z.object({
  concepto: z.string().min(1),
  valor: z.union([z.string(), z.number()]),
  justificacion: z.string().min(1, 'Justificación obligatoria'),
});

const entradasSchema = z.object({
  diasVacacionesPendientesAnteriores: z.number().min(0).optional().default(0),
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

function buildResult(
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
    otrosHaberes: entradas.otrosHaberes,
    anticipos: entradas.anticipos,
    otrasDeducciones: entradas.otrasDeducciones,
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

    const entradas = entradasSchema.parse(req.body ?? {}) as EntradasLiquidacion;
    const resultado = buildResult(expediente, entradas);

    if (!liquidacion) {
      liquidacion = lRepo().create({
        expedienteId: expediente.id,
        entradas,
        rubros: resultado.rubros,
        totalHaberes: resultado.totalHaberes,
        totalDeducciones: resultado.totalDeducciones,
        neto: resultado.neto,
        confirmada: false,
        fechaConfirmacion: null,
      });
    } else {
      liquidacion.entradas = entradas;
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

    const entradas = entradasSchema.parse(req.body ?? {}) as EntradasLiquidacion;
    const resultado = buildResult(expediente, entradas);

    liquidacion.entradas = entradas;
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
