import Decimal from 'decimal.js';

Decimal.set({ rounding: Decimal.ROUND_HALF_UP });

export const SBU = 482;

export type Region = 'Sierra-Amazonía' | 'Costa-Galápagos';

export type Causa =
  | 'Renuncia voluntaria'
  | 'Desahucio'
  | 'Despido intempestivo'
  | 'Mutuo acuerdo'
  | 'Fin de contrato';

export type ManualItem = {
  concepto: string;
  valor: number | string;
  justificacion: string;
};

export type CalculoEntradas = {
  remuneracion: number | string;
  fechaIngreso: string;
  fechaSalida: string;
  causa: Causa;
  region: Region;
  decimosMensualizados: boolean;
  diasVacacionesPendientesAnteriores?: number;
  otrosHaberes?: ManualItem[];
  anticipos?: ManualItem[];
  otrasDeducciones?: ManualItem[];
};

export type Rubro = {
  concepto: string;
  tipo: 'haber' | 'deduccion';
  valor: string;
  formula: string;
  origen: 'auto' | 'manual';
};

export type ResultadoLiquidacion = {
  rubros: Rubro[];
  totalHaberes: string;
  totalDeducciones: string;
  neto: string;
};

function money(value: Decimal.Value): Decimal {
  return new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

function assertNonNegative(value: Decimal, label: string): Decimal {
  if (value.isNegative()) {
    throw new Error(`${label} no puede ser negativo`);
  }
  return value;
}

function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function daysBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function addYears(date: Date, years: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear() + years, date.getUTCMonth(), date.getUTCDate()),
  );
}

/** Complete calendar years and remaining day fraction from ingreso to salida. */
export function tiempoServicio(fechaIngreso: string, fechaSalida: string): {
  aniosCompletos: number;
  diasRestantes: number;
  fraccion: Decimal;
} {
  const ingreso = parseDate(fechaIngreso);
  const salida = parseDate(fechaSalida);
  let aniosCompletos = 0;
  let cursor = addYears(ingreso, 1);
  while (cursor <= salida) {
    aniosCompletos += 1;
    cursor = addYears(ingreso, aniosCompletos + 1);
  }
  const ultimoAniversario = addYears(ingreso, aniosCompletos);
  const diasRestantes = daysBetween(ultimoAniversario, salida);
  const fraccion = new Decimal(aniosCompletos).plus(
    new Decimal(diasRestantes).div(365),
  );
  return { aniosCompletos, diasRestantes, fraccion };
}

export function calcularSueldoPendiente(
  remuneracion: number | string,
  fechaSalida: string,
): Decimal {
  const dia = parseDate(fechaSalida).getUTCDate();
  return assertNonNegative(
    money(new Decimal(remuneracion).div(30).times(dia)),
    'Sueldo pendiente',
  );
}

export function calcularDecimoTercero(params: {
  remuneracion: number | string;
  fechaSalida: string;
  sueldoPendiente: Decimal;
  decimosMensualizados: boolean;
}): Decimal {
  if (params.decimosMensualizados) return money(0);

  const salida = parseDate(params.fechaSalida);
  const year = salida.getUTCFullYear();
  const month = salida.getUTCMonth(); // 0-based
  // Período del décimo tercero: 1 dic → 30 nov. Si salida es en dic, inicia el 1 dic del mismo año.
  const periodoInicio =
    month === 11
      ? new Date(Date.UTC(year, 11, 1))
      : new Date(Date.UTC(year - 1, 11, 1));

  // Complete months from periodoInicio until the month before salida month,
  // plus sueldo pendiente for the partial exit month.
  let mesesCompletos = 0;
  let cursorYear = periodoInicio.getUTCFullYear();
  let cursorMonth = periodoInicio.getUTCMonth();
  const salidaYear = salida.getUTCFullYear();
  const salidaMonth = salida.getUTCMonth();

  while (
    cursorYear < salidaYear ||
    (cursorYear === salidaYear && cursorMonth < salidaMonth)
  ) {
    mesesCompletos += 1;
    cursorMonth += 1;
    if (cursorMonth > 11) {
      cursorMonth = 0;
      cursorYear += 1;
    }
  }

  const total = new Decimal(params.remuneracion)
    .times(mesesCompletos)
    .plus(params.sueldoPendiente);
  return assertNonNegative(money(total.div(12)), 'Décimo tercero');
}

export function calcularDecimoCuarto(params: {
  fechaSalida: string;
  region: Region;
  decimosMensualizados: boolean;
}): Decimal {
  if (params.decimosMensualizados) return money(0);

  const salida = parseDate(params.fechaSalida);
  const year = salida.getUTCFullYear();
  const month = salida.getUTCMonth();
  const day = salida.getUTCDate();

  // Sierra: Aug 1; Costa: Mar 1
  const startMonth = params.region === 'Sierra-Amazonía' ? 7 : 2; // 0-based

  let periodoInicioYear = year;
  if (month < startMonth || (month === startMonth && day < 1)) {
    periodoInicioYear = year - 1;
  }
  // If we're before the period start in the calendar year, use previous year's period.
  // Actually for Sierra, period is Aug 1 - Jul 31.
  // For Costa, Mar 1 - Feb 28/29.
  if (params.region === 'Sierra-Amazonía') {
    if (month < 7) periodoInicioYear = year - 1;
  } else {
    if (month < 2) periodoInicioYear = year - 1;
  }

  const periodoInicio = new Date(Date.UTC(periodoInicioYear, startMonth, 1));

  // Days with 30-day months from periodoInicio to fechaSalida (inclusive of exit day)
  let dias = 0;
  let y = periodoInicio.getUTCFullYear();
  let m = periodoInicio.getUTCMonth();
  const endY = salida.getUTCFullYear();
  const endM = salida.getUTCMonth();

  while (y < endY || (y === endY && m < endM)) {
    dias += 30;
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  dias += day;

  return assertNonNegative(
    money(new Decimal(SBU).div(360).times(dias)),
    'Décimo cuarto',
  );
}

export function calcularVacaciones(params: {
  remuneracion: number | string;
  fechaIngreso: string;
  fechaSalida: string;
  sueldoPendiente: Decimal;
  diasVacacionesPendientesAnteriores?: number;
}): Decimal {
  const ingreso = parseDate(params.fechaIngreso);
  const salida = parseDate(params.fechaSalida);
  const { aniosCompletos } = tiempoServicio(
    params.fechaIngreso,
    params.fechaSalida,
  );
  const ultimoAniversario = addYears(ingreso, aniosCompletos);

  // Remuneraciones from last anniversary to salida: complete months + sueldo pendiente
  let mesesCompletos = 0;
  let y = ultimoAniversario.getUTCFullYear();
  let m = ultimoAniversario.getUTCMonth();
  const endY = salida.getUTCFullYear();
  const endM = salida.getUTCMonth();

  while (y < endY || (y === endY && m < endM)) {
    mesesCompletos += 1;
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }

  const remuneraciones = new Decimal(params.remuneracion)
    .times(mesesCompletos)
    .plus(params.sueldoPendiente);
  const base = remuneraciones.div(24);

  const diasAnt = params.diasVacacionesPendientesAnteriores ?? 0;
  const pendientes = new Decimal(params.remuneracion)
    .div(30)
    .times(diasAnt);

  return assertNonNegative(money(base.plus(pendientes)), 'Vacaciones');
}

export function calcularDesahucio(params: {
  remuneracion: number | string;
  fechaIngreso: string;
  fechaSalida: string;
  causa: Causa;
}): Decimal {
  if (params.causa !== 'Desahucio' && params.causa !== 'Despido intempestivo') {
    return money(0);
  }
  const { fraccion } = tiempoServicio(params.fechaIngreso, params.fechaSalida);
  return assertNonNegative(
    money(new Decimal(params.remuneracion).times(0.25).times(fraccion)),
    'Desahucio',
  );
}

export function calcularIndemnizacion(params: {
  remuneracion: number | string;
  fechaIngreso: string;
  fechaSalida: string;
  causa: Causa;
}): Decimal {
  if (params.causa !== 'Despido intempestivo') return money(0);

  const { aniosCompletos, diasRestantes } = tiempoServicio(
    params.fechaIngreso,
    params.fechaSalida,
  );
  let anios = aniosCompletos;
  if (diasRestantes > 0) anios += 1;

  let remuneraciones: number;
  if (anios <= 3) {
    remuneraciones = 3;
  } else {
    remuneraciones = Math.min(anios, 25);
  }

  return assertNonNegative(
    money(new Decimal(params.remuneracion).times(remuneraciones)),
    'Indemnización',
  );
}

export function calcularAporteIess(sueldoPendiente: Decimal): Decimal {
  return assertNonNegative(
    money(sueldoPendiente.times(0.0945)),
    'Aporte IESS',
  );
}

function mapManuales(
  items: ManualItem[] | undefined,
  tipo: 'haber' | 'deduccion',
): Rubro[] {
  if (!items?.length) return [];
  return items.map((item) => {
    const valor = assertNonNegative(money(item.valor), item.concepto);
    return {
      concepto: item.concepto,
      tipo,
      valor: valor.toFixed(2),
      formula: item.justificacion,
      origen: 'manual' as const,
    };
  });
}

export function calcularLiquidacion(
  entradas: CalculoEntradas,
): ResultadoLiquidacion {
  const sueldoPendiente = calcularSueldoPendiente(
    entradas.remuneracion,
    entradas.fechaSalida,
  );
  const vacaciones = calcularVacaciones({
    remuneracion: entradas.remuneracion,
    fechaIngreso: entradas.fechaIngreso,
    fechaSalida: entradas.fechaSalida,
    sueldoPendiente,
    diasVacacionesPendientesAnteriores:
      entradas.diasVacacionesPendientesAnteriores,
  });
  const decimoTercero = calcularDecimoTercero({
    remuneracion: entradas.remuneracion,
    fechaSalida: entradas.fechaSalida,
    sueldoPendiente,
    decimosMensualizados: entradas.decimosMensualizados,
  });
  const decimoCuarto = calcularDecimoCuarto({
    fechaSalida: entradas.fechaSalida,
    region: entradas.region,
    decimosMensualizados: entradas.decimosMensualizados,
  });
  const indemnizacion = calcularIndemnizacion({
    remuneracion: entradas.remuneracion,
    fechaIngreso: entradas.fechaIngreso,
    fechaSalida: entradas.fechaSalida,
    causa: entradas.causa,
  });
  const desahucio = calcularDesahucio({
    remuneracion: entradas.remuneracion,
    fechaIngreso: entradas.fechaIngreso,
    fechaSalida: entradas.fechaSalida,
    causa: entradas.causa,
  });
  const iess = calcularAporteIess(sueldoPendiente);

  const rubros: Rubro[] = [
    {
      concepto: 'Sueldo pendiente',
      tipo: 'haber',
      valor: sueldoPendiente.toFixed(2),
      formula: 'remuneración/30 × días del mes de salida',
      origen: 'auto',
    },
    {
      concepto: 'Vacaciones',
      tipo: 'haber',
      valor: vacaciones.toFixed(2),
      formula: 'remuneraciones desde aniversario/24 + días pendientes × remuneración/30',
      origen: 'auto',
    },
    {
      concepto: 'Décimo tercero',
      tipo: 'haber',
      valor: decimoTercero.toFixed(2),
      formula: '(remuneraciones del período + sueldo pendiente)/12',
      origen: 'auto',
    },
    {
      concepto: 'Décimo cuarto',
      tipo: 'haber',
      valor: decimoCuarto.toFixed(2),
      formula: 'SBU/360 × días del período',
      origen: 'auto',
    },
    {
      concepto: 'Indemnización',
      tipo: 'haber',
      valor: indemnizacion.toFixed(2),
      formula: 'según años de servicio (máx. 25 remuneraciones)',
      origen: 'auto',
    },
    {
      concepto: 'Desahucio',
      tipo: 'haber',
      valor: desahucio.toFixed(2),
      formula: '25% × remuneración × tiempo de servicio',
      origen: 'auto',
    },
    ...mapManuales(entradas.otrosHaberes, 'haber'),
    {
      concepto: 'Aporte IESS 9.45%',
      tipo: 'deduccion',
      valor: iess.toFixed(2),
      formula: '9.45% × sueldo pendiente',
      origen: 'auto',
    },
    ...mapManuales(entradas.anticipos, 'deduccion'),
    ...mapManuales(entradas.otrasDeducciones, 'deduccion'),
  ];

  const totalHaberes = money(
    rubros
      .filter((r) => r.tipo === 'haber')
      .reduce((acc, r) => acc.plus(r.valor), new Decimal(0)),
  );
  const totalDeducciones = money(
    rubros
      .filter((r) => r.tipo === 'deduccion')
      .reduce((acc, r) => acc.plus(r.valor), new Decimal(0)),
  );
  const neto = assertNonNegative(
    money(totalHaberes.minus(totalDeducciones)),
    'Neto',
  );

  return {
    rubros,
    totalHaberes: totalHaberes.toFixed(2),
    totalDeducciones: totalDeducciones.toFixed(2),
    neto: neto.toFixed(2),
  };
}
