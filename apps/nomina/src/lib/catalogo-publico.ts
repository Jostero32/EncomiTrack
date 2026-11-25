/**
 * Escala nacional de remuneraciones mensuales unificadas del servicio público.
 *
 * Los códigos son internos y estables para poder conservar el vínculo del cargo
 * cuando se publique una nueva versión de la escala. Los grupos y valores
 * corresponden a la escala nacional reformada por MDT-2017-0154; la norma
 * técnica MDT-2025-108 mantiene la estructura de veinte grados.
 */
export const FUENTE_ESCALA_LOSEP =
  "https://www.registroficial.gob.ec/registro-oficial-no-102-14/";

export const ESCALA_NACIONAL_LOSEP = [
  ["LOSEP-G01", "Servidor Público de Servicios 1", 1, 52700],
  ["LOSEP-G02", "Servidor Público de Servicios 2", 2, 55300],
  ["LOSEP-G03", "Servidor Público de Apoyo 1", 3, 58500],
  ["LOSEP-G04", "Servidor Público de Apoyo 2", 4, 62200],
  ["LOSEP-G05", "Servidor Público de Apoyo 3", 5, 67500],
  ["LOSEP-G06", "Servidor Público de Apoyo 4", 6, 73300],
  ["LOSEP-G07", "Servidor Público 1", 7, 81700],
  ["LOSEP-G08", "Servidor Público 2", 8, 90100],
  ["LOSEP-G09", "Servidor Público 3", 9, 98600],
  ["LOSEP-G10", "Servidor Público 4", 10, 108600],
  ["LOSEP-G11", "Servidor Público 5", 11, 121200],
  ["LOSEP-G12", "Servidor Público 6", 12, 141200],
  ["LOSEP-G13", "Servidor Público 7", 13, 167600],
  ["LOSEP-G14", "Servidor Público 8", 14, 176000],
  ["LOSEP-G15", "Servidor Público 9", 15, 203400],
  ["LOSEP-G16", "Servidor Público 10", 16, 230800],
  ["LOSEP-G17", "Servidor Público 11", 17, 247200],
  ["LOSEP-G18", "Servidor Público 12", 18, 264100],
  ["LOSEP-G19", "Servidor Público 13", 19, 296700],
  ["LOSEP-G20", "Servidor Público 14", 20, 354200],
] as const;

/**
 * LOEP permite que cada empresa pública construya su clasificación interna.
 * Estas filas son solo una plantilla funcional: no contienen remuneraciones
 * oficiales ni se usan para bloquear el sueldo hasta que sean configuradas.
 */
export const FUENTE_DIRECTRICES_LOEP =
  "https://www.trabajo.gob.ec/wp-content/uploads/2024/03/ACUERDO-MINISTERIAL-NO.-039-signed.pdf";

export const PLANTILLA_ESCALA_LOEP = [
  ["LOEP-DIRECTIVO", "Nivel directivo", "Dirección"],
  ["LOEP-JEFATURA", "Jefatura / coordinación", "Jefatura"],
  ["LOEP-PROFESIONAL", "Profesional", "Profesional"],
  ["LOEP-TECNICO", "Técnico", "Técnico"],
  ["LOEP-ADMINISTRATIVO", "Administrativo", "Administrativo"],
  ["LOEP-OPERATIVO", "Operativo / servicios", "Operativo"],
] as const;
