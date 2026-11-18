import { formatoDecimalEc } from './calculos';
import { BienAsignado } from './entities/BienAsignado';
import { ESTADOS_DEUDA_VIGENTE, Obligacion } from './entities/Obligacion';
import { PlantillaRequisito } from './entities/PlantillaRequisito';
import { Requisito } from './entities/Requisito';

export type RequisitoGenerado = Pick<
  Requisito,
  | 'departamento'
  | 'origen'
  | 'referenciaId'
  | 'pregunta'
  | 'respuestaEsperada'
  | 'orden'
>;

/** Orden base para requisitos derivados de bienes y obligaciones (después de la plantilla). */
const ORDEN_BIENES = 1000;
const ORDEN_OBLIGACIONES = 2000;

/**
 * Orden de las áreas del paz y salvo. Las áreas que no están en la lista van al
 * final, antes de Talento Humano (que siempre cierra).
 */
export const ORDEN_AREAS = [
  'Jefe inmediato',
  'Sistemas',
  'Bodega',
  'Contabilidad',
  'Talento Humano',
] as const;

export function rangoArea(departamento: string): number {
  const i = (ORDEN_AREAS as readonly string[]).indexOf(departamento);
  if (i >= 0) return i === ORDEN_AREAS.length - 1 ? 1000 : i;
  return 500;
}

/** Áreas ordenadas según ORDEN_AREAS (desempate alfabético). */
export function ordenarAreas(departamentos: Iterable<string>): string[] {
  return [...new Set(departamentos)].sort(
    (a, b) => rangoArea(a) - rangoArea(b) || a.localeCompare(b, 'es'),
  );
}

export function preguntaBien(
  bien: Pick<BienAsignado, 'tipo' | 'descripcion' | 'codigoSerie'>,
): string {
  const serie = bien.codigoSerie?.trim();
  const tipo = bien.tipo === 'Otro' ? '' : `${bien.tipo.toLowerCase()} `;
  return serie
    ? `¿Devolvió ${tipo}"${bien.descripcion}" (serie ${serie})?`
    : `¿Devolvió ${tipo}"${bien.descripcion}"?`;
}

export function preguntaObligacion(
  o: Pick<Obligacion, 'tipo' | 'concepto' | 'valor'>,
): string {
  const valor = formatoDecimalEc(o.valor);
  return `¿Tiene pendiente ${o.tipo.toLowerCase()} "${o.concepto}" por $${valor}?`;
}

/**
 * Requisitos del paz y salvo: preguntas de la plantilla + una por cada bien
 * en estado Asignado + una por cada obligación Pendiente.
 */
export function generarRequisitos(
  plantilla: PlantillaRequisito[],
  bienes: BienAsignado[],
  obligaciones: Obligacion[],
): RequisitoGenerado[] {
  const dePlantilla = [...plantilla]
    .sort((a, b) => a.orden - b.orden || a.id - b.id)
    .map<RequisitoGenerado>((p) => ({
      departamento: p.departamento,
      origen: 'Plantilla',
      referenciaId: null,
      pregunta: p.pregunta,
      respuestaEsperada: p.respuestaEsperada,
      orden: p.orden,
    }));

  const deBienes = bienes
    .filter((b) => b.estado === 'Asignado')
    .map<RequisitoGenerado>((b, i) => ({
      departamento: b.departamentoResponsable,
      origen: 'Bien',
      referenciaId: b.id,
      pregunta: preguntaBien(b),
      respuestaEsperada: 'SI',
      orden: ORDEN_BIENES + i,
    }));

  const deObligaciones = obligaciones
    .filter((o) => ESTADOS_DEUDA_VIGENTE.includes(o.estado))
    .map<RequisitoGenerado>((o, i) => ({
      departamento: 'Contabilidad',
      origen: 'Obligacion',
      referenciaId: o.id,
      pregunta: preguntaObligacion(o),
      respuestaEsperada: 'NO',
      orden: ORDEN_OBLIGACIONES + i,
    }));

  return [...dePlantilla, ...deBienes, ...deObligaciones];
}
