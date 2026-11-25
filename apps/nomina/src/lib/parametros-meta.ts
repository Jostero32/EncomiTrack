/**
 * Presentación de los parámetros. La clave (`iess_aporte_personal`) es el
 * identificador estable que usa el motor; aquí se define cómo se muestra.
 */

export const GRUPOS_PARAMETRO = [
  "Salario básico",
  "Seguridad social (IESS)",
  "Jornada y horas extras",
  "Límites de horas suplementarias",
  "Otros",
] as const;

export type GrupoParametro = (typeof GRUPOS_PARAMETRO)[number];

export interface MetaParametro {
  nombre: string;
  grupo: GrupoParametro;
  /** Unidad para valores numéricos sin tipo monetario o porcentual. */
  unidad?: string;
  ayuda?: string;
}

const META: Record<string, MetaParametro> = {
  sbu: {
    nombre: "Salario Básico Unificado",
    grupo: "Salario básico",
    ayuda: "Piso salarial general y base del décimo cuarto sueldo.",
  },
  iess_aporte_personal: {
    nombre: "Aporte personal IESS",
    grupo: "Seguridad social (IESS)",
    ayuda: "Se descuenta al empleado sobre la base de aportación.",
  },
  iess_aporte_patronal: {
    nombre: "Aporte patronal IESS",
    grupo: "Seguridad social (IESS)",
    ayuda: "Lo paga el empleador; se registra como provisión.",
  },
  fondos_reserva_pct: {
    nombre: "Fondos de reserva",
    grupo: "Seguridad social (IESS)",
    ayuda: "Se paga desde el segundo año de servicio.",
  },
  divisor_horas_mes: {
    nombre: "Horas mensuales para valor hora",
    grupo: "Jornada y horas extras",
    unidad: "h",
    ayuda: "Sueldo ÷ este divisor = valor de una hora ordinaria.",
  },
  recargo_nocturno_pct: {
    nombre: "Recargo nocturno",
    grupo: "Jornada y horas extras",
    ayuda: "Trabajo entre las 19h00 y las 06h00.",
  },
  recargo_suplementaria_pct: {
    nombre: "Recargo horas suplementarias",
    grupo: "Jornada y horas extras",
    ayuda: "Horas adicionales a la jornada en días laborables.",
  },
  recargo_extraordinaria_pct: {
    nombre: "Recargo horas extraordinarias",
    grupo: "Jornada y horas extras",
    ayuda: "Fines de semana y feriados.",
  },
  limite_suplementarias_mes: {
    nombre: "Límite mensual",
    grupo: "Límites de horas suplementarias",
    unidad: "h/mes",
  },
  limite_suplementarias_dia: {
    nombre: "Límite diario",
    grupo: "Límites de horas suplementarias",
    unidad: "h/día",
  },
};

/** Parámetros sin entrada en el catálogo: se muestra la clave como texto legible. */
function nombreDesdeClave(clave: string) {
  const texto = clave.replace(/_pct$/, "").replace(/_/g, " ");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function metaParametro(clave: string): MetaParametro {
  return META[clave] ?? { nombre: nombreDesdeClave(clave), grupo: "Otros" };
}
