import { EntityManager, In } from 'typeorm';
import { AprobacionDepartamento } from './entities/AprobacionDepartamento';
import { BienAsignado } from './entities/BienAsignado';
import { Documento } from './entities/Documento';
import { Obligacion } from './entities/Obligacion';
import { PlantillaRequisito } from './entities/PlantillaRequisito';
import {
  calcularCumple,
  Requisito,
  RespuestaRequisito,
} from './entities/Requisito';
import { badRequest, conflict } from './errors';
import { generarRequisitos, RequisitoGenerado } from './paz-salvo';

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Clave estable de un requisito para no duplicarlo al regenerar. */
function claveRequisito(
  r: Pick<Requisito, 'origen' | 'referenciaId' | 'departamento' | 'pregunta'>,
): string {
  return r.origen === 'Plantilla'
    ? `Plantilla:${r.departamento}|${r.pregunta}`
    : `${r.origen}:${r.referenciaId}`;
}

async function requisitosGenerados(
  manager: EntityManager,
  trabajadorId: number,
): Promise<RequisitoGenerado[]> {
  const [plantilla, bienes, obligaciones] = await Promise.all([
    manager.find(PlantillaRequisito),
    manager.find(BienAsignado, { where: { trabajadorId }, order: { id: 'ASC' } }),
    manager.find(Obligacion, {
      where: { trabajadorId },
      order: { fecha: 'ASC', id: 'ASC' },
    }),
  ]);
  return generarRequisitos(plantilla, bienes, obligaciones);
}

function nuevoRequisito(
  manager: EntityManager,
  expedienteId: number,
  r: RequisitoGenerado,
): Requisito {
  return manager.create(Requisito, {
    ...r,
    expedienteId,
    respuesta: null,
    cumple: false,
    responsable: null,
    fechaRevision: null,
    observacion: null,
  });
}

/** Crea los requisitos de un expediente nuevo (plantilla + bienes + obligaciones). */
export async function crearRequisitos(
  manager: EntityManager,
  expedienteId: number,
  trabajadorId: number,
): Promise<void> {
  const generados = await requisitosGenerados(manager, trabajadorId);
  await manager.save(generados.map((r) => nuevoRequisito(manager, expedienteId, r)));
}

/**
 * Borra los requisitos sin respuesta (y sin evidencias) y vuelve a crear los que
 * falten desde la plantilla, los bienes y las obligaciones actuales. Revoca la
 * certificación de las áreas que reciben ítems nuevos.
 */
export async function regenerarRequisitos(
  manager: EntityManager,
  expedienteId: number,
  trabajadorId: number,
): Promise<{ eliminados: number; creados: number }> {
  const actuales = await manager.find(Requisito, {
    where: { expedienteId },
    relations: ['documentos'],
  });
  const conservar = actuales.filter(
    (r) => r.respuesta !== null || (r.documentos?.length ?? 0) > 0,
  );
  const eliminar = actuales.filter((r) => !conservar.includes(r));
  if (eliminar.length) await manager.remove(eliminar);

  const claves = new Set(conservar.map(claveRequisito));
  const faltantes = (await requisitosGenerados(manager, trabajadorId)).filter(
    (r) => !claves.has(claveRequisito(r)),
  );
  if (faltantes.length) {
    await manager.save(faltantes.map((r) => nuevoRequisito(manager, expedienteId, r)));
    const areas = [...new Set(faltantes.map((r) => r.departamento))];
    await manager.delete(AprobacionDepartamento, {
      expedienteId,
      departamento: In(areas),
    });
  }
  return { eliminados: eliminar.length, creados: faltantes.length };
}

export async function areaCertificada(
  manager: EntityManager,
  expedienteId: number,
  departamento: string,
): Promise<AprobacionDepartamento | null> {
  return manager.findOne(AprobacionDepartamento, {
    where: { expedienteId, departamento },
  });
}

export type RespuestaInput = {
  respuesta: RespuestaRequisito | null;
  responsable?: string | null;
  observacion?: string | null;
};

/**
 * Registra la respuesta de un requisito y sincroniza su origen:
 * - Bien: SI → Devuelto, N/A → No aplica, NO/sin respuesta → Asignado.
 * - Obligación: NO con deuda Pendiente → Por descontar (se descuenta en la
 *   liquidación); SI/sin respuesta revierte Por descontar → Pendiente.
 */
export async function aplicarRespuesta(
  manager: EntityManager,
  requisito: Requisito,
  data: RespuestaInput,
): Promise<Requisito> {
  if (await areaCertificada(manager, requisito.expedienteId, requisito.departamento)) {
    throw conflict(
      `El área ${requisito.departamento} ya está certificada: revierta la certificación para modificarla`,
    );
  }

  const observacion = data.observacion?.trim() || null;
  const cumple = calcularCumple(data.respuesta, requisito.respuestaEsperada);
  if (data.respuesta !== null && (!cumple || data.respuesta === 'N/A') && !observacion) {
    throw badRequest(
      data.respuesta === 'N/A'
        ? 'Observación obligatoria cuando la respuesta es N/A'
        : 'Observación obligatoria cuando el requisito no cumple',
    );
  }

  if (requisito.origen === 'Obligacion' && requisito.referenciaId) {
    const obligacion = await manager.findOne(Obligacion, {
      where: { id: requisito.referenciaId },
    });
    if (obligacion) {
      if (data.respuesta === 'NO' && obligacion.estado === 'Pendiente') {
        obligacion.estado = 'Por descontar';
        await manager.save(obligacion);
      } else if (
        (data.respuesta === 'SI' || data.respuesta === null) &&
        obligacion.estado === 'Por descontar'
      ) {
        obligacion.estado = 'Pendiente';
        await manager.save(obligacion);
      }
    }
  }

  if (requisito.origen === 'Bien' && requisito.referenciaId) {
    const bien = await manager.findOne(BienAsignado, {
      where: { id: requisito.referenciaId },
    });
    if (bien) {
      if (data.respuesta === 'SI') {
        bien.estado = 'Devuelto';
        bien.fechaDevolucion = bien.fechaDevolucion ?? hoy();
      } else if (data.respuesta === 'N/A') {
        bien.estado = 'No aplica';
        bien.fechaDevolucion = null;
      } else {
        bien.estado = 'Asignado';
        bien.fechaDevolucion = null;
      }
      await manager.save(bien);
    }
  }

  requisito.respuesta = data.respuesta;
  requisito.cumple = cumple;
  requisito.responsable =
    data.respuesta === null ? null : data.responsable?.trim() || requisito.responsable;
  requisito.observacion = observacion;
  requisito.fechaRevision = data.respuesta === null ? null : new Date();
  return manager.save(requisito);
}

/** Datos del bien u obligación de origen, para mostrar junto al requisito. */
export type DetalleRequisito =
  | {
      origen: 'Bien';
      tipo: string;
      descripcion: string;
      codigoSerie: string | null;
      fechaAsignacion: string | null;
      estado: string;
    }
  | {
      origen: 'Obligacion';
      tipo: string;
      concepto: string;
      valor: string;
      fecha: string;
      estado: string;
    };

export async function detallesRequisitos(
  manager: EntityManager,
  requisitos: Requisito[],
): Promise<Map<number, DetalleRequisito>> {
  const idsBien = requisitos.filter((r) => r.origen === 'Bien' && r.referenciaId).map((r) => r.referenciaId as number);
  const idsObl = requisitos
    .filter((r) => r.origen === 'Obligacion' && r.referenciaId)
    .map((r) => r.referenciaId as number);
  const [bienes, obligaciones] = await Promise.all([
    idsBien.length ? manager.find(BienAsignado, { where: { id: In(idsBien) } }) : [],
    idsObl.length ? manager.find(Obligacion, { where: { id: In(idsObl) } }) : [],
  ]);
  const bienPorId = new Map(bienes.map((b) => [b.id, b]));
  const oblPorId = new Map(obligaciones.map((o) => [o.id, o]));

  const out = new Map<number, DetalleRequisito>();
  for (const r of requisitos) {
    if (r.origen === 'Bien' && r.referenciaId) {
      const b = bienPorId.get(r.referenciaId);
      if (b) {
        out.set(r.id, {
          origen: 'Bien',
          tipo: b.tipo,
          descripcion: b.descripcion,
          codigoSerie: b.codigoSerie,
          fechaAsignacion: b.fechaAsignacion,
          estado: b.estado,
        });
      }
    } else if (r.origen === 'Obligacion' && r.referenciaId) {
      const o = oblPorId.get(r.referenciaId);
      if (o) {
        out.set(r.id, {
          origen: 'Obligacion',
          tipo: o.tipo,
          concepto: o.concepto,
          valor: o.valor,
          fecha: o.fecha,
          estado: o.estado,
        });
      }
    }
  }
  return out;
}

/** Número de documentos (evidencias) por requisito. */
export async function conteoEvidencias(
  manager: EntityManager,
  requisitoIds: number[],
): Promise<Map<number, number>> {
  if (!requisitoIds.length) return new Map();
  const filas = await manager
    .createQueryBuilder(Documento, 'd')
    .select('d.requisitoId', 'requisitoId')
    .addSelect('COUNT(*)', 'n')
    .where('d.requisitoId IN (:...ids)', { ids: requisitoIds })
    .groupBy('d.requisitoId')
    .getRawMany<{ requisitoId: number; n: number }>();
  return new Map(filas.map((f) => [Number(f.requisitoId), Number(f.n)]));
}
