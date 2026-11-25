import Decimal from 'decimal.js';
import { SBU, tiempoServicio, type Region } from './calculos';
import type { VacacionGozada } from './entities/VacacionGozada';
import type { PeriodoVacaciones } from './calculos';

const MESES_CORTOS = [
  'ENE',
  'FEB',
  'MAR',
  'ABR',
  'MAY',
  'JUN',
  'JUL',
  'AGO',
  'SEP',
  'OCT',
  'NOV',
  'DIC',
];

const MESES_LARGOS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** Paleta de EncomiTrack (igual que frontend/src/styles.scss). */
export const MARCA = {
  azul: '#11406f',
  azulOscuro: '#0c3157',
  azulSuave: '#e5edf6',
  rojo: '#ba2b32',
  dorado: '#e8b406',
  gris: '#66615c',
} as const;

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatMoney(value: string | number): string {
  const n = new Decimal(value || 0).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  return `$ ${n.toNumber().toLocaleString('es-EC', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatFechaLarga(iso: string): string {
  const d = parseIsoDate(iso);
  return `${d.getUTCDate()} de ${MESES_LARGOS[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

export function formatFechaCorta(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const iso = typeof value === 'string' ? value.slice(0, 10) : value.toISOString().slice(0, 10);
  const d = parseIsoDate(iso);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

export function ciudadDesdeDireccion(direccion: string): string {
  const parts = direccion
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length ? parts[parts.length - 1] : direccion;
}

function labelMesAnio(date: Date): string {
  const yy = String(date.getUTCFullYear()).slice(-2);
  return `${MESES_CORTOS[date.getUTCMonth()]} ${yy}`;
}

/** Metadatos de presentación para la liquidación (no altera montos). */
/**
 * Tiempo trabajado en meses calendario completos más días, contando el día de
 * salida (01/03/2023 → 15/11/2026 = 44 meses y 15 días).
 */
export function mesesYDiasTrabajados(
  fechaIngreso: string,
  fechaSalida: string,
): { mesesTrabajados: number; diasTrabajados: number } {
  const ingreso = parseIsoDate(fechaIngreso);
  const salida = parseIsoDate(fechaSalida);
  let meses =
    (salida.getUTCFullYear() - ingreso.getUTCFullYear()) * 12 +
    (salida.getUTCMonth() - ingreso.getUTCMonth());
  if (salida.getUTCDate() < ingreso.getUTCDate()) meses -= 1;
  meses = Math.max(meses, 0);
  const ancla = new Date(
    Date.UTC(ingreso.getUTCFullYear(), ingreso.getUTCMonth() + meses, ingreso.getUTCDate()),
  );
  const dias = Math.round((salida.getTime() - ancla.getTime()) / 86_400_000) + 1;
  return { mesesTrabajados: meses, diasTrabajados: Math.max(dias, 0) };
}

export function metadatosLiquidacionPdf(params: {
  remuneracion: string | number;
  fechaIngreso: string;
  fechaSalida: string;
  region: Region;
  decimosMensualizados: boolean;
}): {
  mesesTrabajados: number;
  diasTrabajados: number;
  diaSalida: number;
  valorMes: {
    sueldo: string;
    decimoTercero: string;
    decimoCuarto: string;
    vacaciones: string;
  };
  valorDia: {
    sueldo: string;
    decimoTercero: string;
    decimoCuarto: string;
    vacaciones: string;
  };
  periodoDecimoTercero: string;
  mesesDecimoTercero: number;
  diasDecimoTercero: number;
  periodoDecimoCuarto: string;
  diasDecimoCuarto: number;
} {
  const rem = new Decimal(params.remuneracion);
  const { aniosCompletos, diasRestantes } = tiempoServicio(
    params.fechaIngreso,
    params.fechaSalida,
  );
  const salida = parseIsoDate(params.fechaSalida);
  const diaSalida = salida.getUTCDate();

  const year = salida.getUTCFullYear();
  const month = salida.getUTCMonth();
  const periodo13Inicio =
    month === 11
      ? new Date(Date.UTC(year, 11, 1))
      : new Date(Date.UTC(year - 1, 11, 1));
  let meses13 = 0;
  let cy = periodo13Inicio.getUTCFullYear();
  let cm = periodo13Inicio.getUTCMonth();
  while (cy < year || (cy === year && cm < month)) {
    meses13 += 1;
    cm += 1;
    if (cm > 11) {
      cm = 0;
      cy += 1;
    }
  }

  const startMonth = params.region === 'Sierra-Amazonía' ? 7 : 2;
  let periodo14Year = year;
  if (params.region === 'Sierra-Amazonía') {
    if (month < 7) periodo14Year = year - 1;
  } else if (month < 2) {
    periodo14Year = year - 1;
  }
  const periodo14Inicio = new Date(Date.UTC(periodo14Year, startMonth, 1));
  let dias14 = 0;
  let y = periodo14Inicio.getUTCFullYear();
  let m = periodo14Inicio.getUTCMonth();
  while (y < year || (y === year && m < month)) {
    dias14 += 30;
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  dias14 += diaSalida;

  const fin13Label = new Date(Date.UTC(year, month, 1));

  return {
    ...mesesYDiasTrabajados(params.fechaIngreso, params.fechaSalida),
    diaSalida,
    valorMes: {
      sueldo: rem.toFixed(2),
      decimoTercero: rem.div(12).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2),
      decimoCuarto: new Decimal(SBU)
        .div(12)
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
        .toFixed(2),
      vacaciones: rem.div(24).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2),
    },
    valorDia: {
      sueldo: rem.div(30).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2),
      decimoTercero: rem.div(360).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2),
      decimoCuarto: new Decimal(SBU)
        .div(360)
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
        .toFixed(2),
      vacaciones: rem.div(30).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2),
    },
    periodoDecimoTercero: params.decimosMensualizados
      ? 'Mensualizado'
      : `${labelMesAnio(periodo13Inicio)} - ${labelMesAnio(fin13Label)}`,
    mesesDecimoTercero: params.decimosMensualizados ? 0 : meses13,
    diasDecimoTercero: params.decimosMensualizados ? 0 : diaSalida,
    periodoDecimoCuarto: params.decimosMensualizados
      ? 'Mensualizado'
      : `${labelMesAnio(periodo14Inicio)} - ${labelMesAnio(salida)}`,
    diasDecimoCuarto: params.decimosMensualizados ? 0 : dias14,
  };
}

export type PeriodoConGozadas = PeriodoVacaciones & {
  solicitudes: VacacionGozada[];
};

/** Agrupa solicitudes gozadas por período según fecha de inicio. */
export function periodosConSolicitudes(
  periodos: PeriodoVacaciones[],
  gozadas: VacacionGozada[],
): PeriodoConGozadas[] {
  return periodos.map((p) => ({
    ...p,
    solicitudes: gozadas.filter(
      (g) => g.fechaInicio >= p.desde && g.fechaInicio <= p.hasta,
    ),
  }));
}
