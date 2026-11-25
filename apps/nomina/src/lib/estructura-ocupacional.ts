/**
 * Estructura ocupacional usada por las comisiones sectoriales del Ministerio
 * del Trabajo. El nivel A aparece como "A" en la definición general y como
 * "A1" en las tablas de cargos; se guarda A1 para coincidir con dichas tablas.
 */
export const ESTRUCTURAS_OCUPACIONALES = [
  { codigo: "A1", nivel: "A", grupo: "Jefatura", nombre: "Jefatura" },
  { codigo: "B1", nivel: "B", grupo: "Supervisión", nombre: "Supervisión general" },
  { codigo: "B2", nivel: "B", grupo: "Supervisión", nombre: "Supervisión técnica" },
  { codigo: "B3", nivel: "B", grupo: "Supervisión", nombre: "Supervisión operativa" },
  { codigo: "C1", nivel: "C", grupo: "Operación", nombre: "Operación especializada" },
  { codigo: "C2", nivel: "C", grupo: "Operación", nombre: "Operación técnica" },
  { codigo: "C3", nivel: "C", grupo: "Operación", nombre: "Operación básica" },
  { codigo: "D1", nivel: "D", grupo: "Asistencia", nombre: "Asistencia administrativa" },
  { codigo: "D2", nivel: "D", grupo: "Asistencia", nombre: "Asistencia técnica" },
  { codigo: "E1", nivel: "E", grupo: "Soporte", nombre: "Soporte administrativo" },
  { codigo: "E2", nivel: "E", grupo: "Soporte", nombre: "Soporte operativo" },
] as const;

export type EstructuraOcupacional = (typeof ESTRUCTURAS_OCUPACIONALES)[number]["codigo"];

export function esEstructuraOcupacional(valor: string): valor is EstructuraOcupacional {
  return ESTRUCTURAS_OCUPACIONALES.some((item) => item.codigo === valor);
}

export function getEstructuraOcupacional(codigo: EstructuraOcupacional) {
  return ESTRUCTURAS_OCUPACIONALES.find((item) => item.codigo === codigo)!;
}

export const NIVELES_OCUPACIONALES = [
  { nivel: "A", nombre: "Jefatura", descripcion: "Dirección y conducción organizacional" },
  { nivel: "B", nombre: "Supervisión", descripcion: "Coordinación y supervisión de equipos" },
  { nivel: "C", nombre: "Operación", descripcion: "Ejecución especializada, técnica o básica" },
  { nivel: "D", nombre: "Asistencia", descripcion: "Apoyo administrativo o técnico" },
  { nivel: "E", nombre: "Soporte", descripcion: "Soporte administrativo u operativo" },
] as const;
