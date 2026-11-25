import { EntityManager, In, Not } from 'typeorm';
import { AprobacionDepartamento } from './entities/AprobacionDepartamento';
import { BienAsignado } from './entities/BienAsignado';
import { Documento } from './entities/Documento';
import { Expediente } from './entities/Expediente';
import { Liquidacion } from './entities/Liquidacion';
import { ESTADOS_DEUDA_VIGENTE, Obligacion } from './entities/Obligacion';
import { calcularCumple, Requisito, RespuestaRequisito } from './entities/Requisito';
import { conflict } from './errors';
import { preguntaBien, preguntaObligacion } from './paz-salvo';

/**
 * Mantiene el expediente abierto del trabajador al día cuando cambian, desde la
 * ficha del trabajador, sus bienes, deudas, vacaciones o datos laborales.
 *
 * Reglas:
 * - Expediente "En proceso": se crean, actualizan o borran los requisitos del paz
 *   y salvo; si un área certificada recibe un cambio que la deja sin cumplir, se
 *   revoca su certificación.
 * - "Paz y salvo aprobado": los bienes y deudas no se pueden modificar hasta
 *   reabrir el paz y salvo.
 * - Liquidación calculada sin confirmar: queda marcada como desactualizada.
 *   Liquidación confirmada: se bloquean los cambios que la alterarían.
 * - Expediente finalizado: la ficha se edita libremente (es historial).
 */

export type Accion = 'crear' | 'editar' | 'eliminar';

export async function expedienteAbierto(
  manager: EntityManager,
  trabajadorId: number,
): Promise<Expediente | null> {
  return manager.findOne(Expediente, {
    where: { trabajadorId, estado: Not('Finalizado' as const) },
    relations: ['liquidacion'],
    order: { id: 'DESC' },
  });
}

/** Bloquea cambios de bienes/deudas mientras el paz y salvo está aprobado. */
export function assertPazSalvoEditable(exp: Expediente | null, que: string): void {
  assertLiquidacionAbierta(exp, que);
  if (exp?.estado === 'Paz y salvo aprobado') {
    throw conflict(
      `El paz y salvo de ${exp.numero} ya está aprobado: reábralo desde el expediente para modificar ${que}`,
    );
  }
}

/** Bloquea cambios que alterarían una liquidación ya confirmada. */
export function assertLiquidacionAbierta(exp: Expediente | null, que: string): void {
  if (exp?.liquidacion?.confirmada) {
    throw conflict(
      `La liquidación de ${exp.numero} ya está confirmada: no se puede modificar ${que} hasta finalizar el expediente`,
    );
  }
}

/** Marca la liquidación calculada (no confirmada) como desactualizada. */
export async function marcarLiquidacionDesactualizada(
  manager: EntityManager,
  exp: Expediente | null,
): Promise<string | null> {
  const liq = exp?.liquidacion;
  if (!exp || !liq || liq.confirmada || liq.desactualizada) return null;
  await manager.update(Liquidacion, { id: liq.id }, { desactualizada: true });
  return `La liquidación de ${exp.numero} quedó desactualizada: recalcúlela`;
}

async function revocarAreas(
  manager: EntityManager,
  expedienteId: number,
  areas: string[],
): Promise<string[]> {
  if (!areas.length) return [];
  const certificadas = await manager.find(AprobacionDepartamento, {
    where: { expedienteId, departamento: In(areas) },
  });
  if (certificadas.length) await manager.remove(certificadas);
  return certificadas.map((a) => a.departamento);
}

async function borrarRequisito(manager: EntityManager, req: Requisito): Promise<void> {
  // Las evidencias se conservan en el expediente, sin requisito asociado.
  await manager.update(Documento, { requisitoId: req.id }, { requisitoId: null });
  await manager.delete(Requisito, { id: req.id });
}

function fijarRespuesta(
  req: Requisito,
  respuesta: RespuestaRequisito | null,
  observacion?: string | null,
): void {
  req.respuesta = respuesta;
  req.cumple = calcularCumple(respuesta, req.respuestaEsperada);
  req.fechaRevision = respuesta === null ? null : new Date();
  if (respuesta === null) req.responsable = null;
  if (observacion !== undefined && !req.observacion?.trim()) req.observacion = observacion;
}

function mensaje(exp: Expediente, partes: string[], revocadas: string[]): string | null {
  if (!partes.length) return null;
  let m = `Paz y salvo de ${exp.numero}: ${partes.join('; ')}`;
  if (revocadas.length) m += `. Certifique de nuevo: ${revocadas.join(', ')}`;
  return m;
}

/** Respuesta del requisito que corresponde al estado del bien en la ficha. */
function respuestaDeBien(bien: BienAsignado): RespuestaRequisito | null {
  if (bien.estado === 'Devuelto') return 'SI';
  if (bien.estado === 'No aplica') return 'N/A';
  return null;
}

export async function sincronizarBien(
  manager: EntityManager,
  exp: Expediente | null,
  bien: BienAsignado,
  accion: Accion,
): Promise<string | null> {
  if (!exp || exp.estado !== 'En proceso') return null;
  const req = await manager.findOne(Requisito, {
    where: { expedienteId: exp.id, origen: 'Bien', referenciaId: bien.id },
  });
  const partes: string[] = [];
  const afectadas = new Set<string>();

  if (accion === 'eliminar') {
    if (!req) return null;
    await borrarRequisito(manager, req);
    return mensaje(exp, [`se quitó "${bien.descripcion}"`], []);
  }

  if (!req) {
    if (bien.estado !== 'Asignado') return null;
    const ultimo = await manager.findOne(Requisito, {
      where: { expedienteId: exp.id },
      order: { orden: 'DESC' },
    });
    await manager.save(
      manager.create(Requisito, {
        expedienteId: exp.id,
        departamento: bien.departamentoResponsable,
        origen: 'Bien',
        referenciaId: bien.id,
        pregunta: preguntaBien(bien),
        respuestaEsperada: 'SI',
        respuesta: null,
        cumple: false,
        orden: Math.max((ultimo?.orden ?? 0) + 1, 1000),
        responsable: null,
        fechaRevision: null,
        observacion: null,
      }),
    );
    partes.push(`se agregó "${bien.descripcion}" en ${bien.departamentoResponsable}`);
    afectadas.add(bien.departamentoResponsable);
  } else {
    const pregunta = preguntaBien(bien);
    if (req.pregunta !== pregunta) {
      req.pregunta = pregunta;
      partes.push(`se actualizó "${bien.descripcion}"`);
    }
    if (req.departamento !== bien.departamentoResponsable) {
      afectadas.add(req.departamento).add(bien.departamentoResponsable);
      partes.push(`"${bien.descripcion}" pasó de ${req.departamento} a ${bien.departamentoResponsable}`);
      req.departamento = bien.departamentoResponsable;
    }
    const nueva = respuestaDeBien(bien);
    // "Asignado" solo limpia respuestas que lo daban por devuelto o no aplicable.
    const debeCambiar =
      nueva !== null ? req.respuesta !== nueva : req.respuesta === 'SI' || req.respuesta === 'N/A';
    if (debeCambiar) {
      fijarRespuesta(
        req,
        nueva,
        nueva === 'N/A'
          ? bien.observacion?.trim() || 'Marcado como No aplica en la ficha del trabajador'
          : undefined,
      );
      partes.push(
        nueva === null
          ? `"${bien.descripcion}" volvió a pendiente`
          : `"${bien.descripcion}" respondido ${nueva === 'SI' ? 'SÍ' : nueva}`,
      );
      if (!req.cumple) afectadas.add(req.departamento);
    }
    if (!partes.length) return null;
    await manager.save(req);
  }

  const revocadas = await revocarAreas(manager, exp.id, [...afectadas]);
  return mensaje(exp, partes, revocadas);
}

export async function sincronizarObligacion(
  manager: EntityManager,
  exp: Expediente | null,
  o: Obligacion,
  accion: Accion,
): Promise<string | null> {
  if (!exp) return null;
  const avisos: string[] = [];

  if (exp.estado === 'En proceso') {
    const req = await manager.findOne(Requisito, {
      where: { expedienteId: exp.id, origen: 'Obligacion', referenciaId: o.id },
    });
    const partes: string[] = [];
    const afectadas: string[] = [];
    const vigente = ESTADOS_DEUDA_VIGENTE.includes(o.estado);

    if (accion === 'eliminar') {
      if (req) {
        await borrarRequisito(manager, req);
        partes.push(`se quitó la deuda "${o.concepto}"`);
      }
    } else if (!req) {
      if (vigente) {
        const ultimo = await manager.findOne(Requisito, {
          where: { expedienteId: exp.id },
          order: { orden: 'DESC' },
        });
        await manager.save(
          manager.create(Requisito, {
            expedienteId: exp.id,
            departamento: 'Contabilidad',
            origen: 'Obligacion',
            referenciaId: o.id,
            pregunta: preguntaObligacion(o),
            respuestaEsperada: 'NO',
            respuesta: o.estado === 'Por descontar' ? 'NO' : null,
            cumple: o.estado === 'Por descontar',
            orden: Math.max((ultimo?.orden ?? 0) + 1, 2000),
            responsable: null,
            fechaRevision: o.estado === 'Por descontar' ? new Date() : null,
            observacion: null,
          }),
        );
        partes.push(`se agregó la deuda "${o.concepto}" en Contabilidad`);
        afectadas.push('Contabilidad');
      }
    } else {
      const pregunta = preguntaObligacion(o);
      if (req.pregunta !== pregunta) {
        req.pregunta = pregunta;
        partes.push(`se actualizó la deuda "${o.concepto}"`);
      }
      // Pagada / Por descontar ⇒ NO (cumple); Pendiente ⇒ vuelve a pendiente.
      const nueva: RespuestaRequisito | null = o.estado === 'Pendiente' ? null : 'NO';
      if (req.respuesta !== nueva && !(nueva === null && req.respuesta === 'SI')) {
        fijarRespuesta(
          req,
          nueva,
          o.estado === 'Pagada' ? 'Pagada (registrada en la ficha del trabajador)' : undefined,
        );
        partes.push(
          nueva === null
            ? `la deuda "${o.concepto}" volvió a pendiente`
            : `la deuda "${o.concepto}" respondida NO (${o.estado})`,
        );
        if (!req.cumple) afectadas.push('Contabilidad');
      }
      if (partes.length) await manager.save(req);
    }

    const revocadas = await revocarAreas(manager, exp.id, afectadas);
    const m = mensaje(exp, partes, revocadas);
    if (m) avisos.push(m);
  }

  const liq = await marcarLiquidacionDesactualizada(manager, exp);
  if (liq) avisos.push(liq);
  return avisos.length ? avisos.join('. ') : null;
}

/** Datos laborales que el expediente copia del trabajador al crearse. */
export type DatosLaborales = { remuneracion?: string; cargo?: string; fechaIngreso?: string };

/**
 * Propaga cambios de remuneración, cargo o fecha de ingreso al expediente abierto
 * (si la liquidación no está confirmada).
 */
export async function sincronizarDatosLaborales(
  manager: EntityManager,
  exp: Expediente | null,
  antes: DatosLaborales,
  despues: DatosLaborales,
): Promise<string | null> {
  if (!exp) return null;
  const distinto = (k: keyof DatosLaborales) =>
    k === 'remuneracion'
      ? Number(despues[k]) !== Number(antes[k])
      : String(despues[k]) !== String(antes[k]);
  const campos = (['remuneracion', 'cargo', 'fechaIngreso'] as const).filter(
    (k) => despues[k] !== undefined && distinto(k),
  );
  if (!campos.length) return null;
  assertLiquidacionAbierta(exp, 'la remuneración, el cargo ni la fecha de ingreso');
  const cambios: Partial<Expediente> = {};
  for (const k of campos) cambios[k] = String(despues[k]);
  await manager.update(Expediente, { id: exp.id }, cambios);
  const etiquetas = { remuneracion: 'remuneración', cargo: 'cargo', fechaIngreso: 'fecha de ingreso' };
  const avisos = [`${exp.numero} actualizado (${campos.map((k) => etiquetas[k]).join(', ')})`];
  const liq = await marcarLiquidacionDesactualizada(manager, exp);
  if (liq) avisos.push(liq);
  return avisos.join('. ');
}
