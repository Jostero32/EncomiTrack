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
  /** id de la Obligacion de origen, si aplica. */
  referenciaId?: number;
};

export type CalculoEntradas = {
  remuneracion: number | string;
  fechaIngreso: string;
  fechaSalida: string;
  causa: Causa;
  region: Region;
  decimosMensualizados: boolean;
  diasVacacionesPendientesAnteriores?: number;
  /** Días gozados que se imputaron al período en curso (anticipo de vacaciones). */
  diasGozadosPeriodoEnCurso?: number;
  /** true: el fondo de reserva se paga en rol (mensualizado) y entra en la liquidación. */
  fondosReservaMensualizados?: boolean;
  otrosHaberes?: ManualItem[];
  anticipos?: ManualItem[];
  otrasDeducciones?: ManualItem[];
  /** Obligaciones pendientes del trabajador, se descuentan automáticamente. */
  obligaciones?: ManualItem[];
};

export type Rubro = {
  concepto: string;
  tipo: 'haber' | 'deduccion';
  valor: string;
  formula: string;
  origen: 'auto' | 'manual' | 'obligacion';
  /** id de la Obligacion descontada (solo origen 'obligacion'). */
  referenciaId?: number;
};

export type ResultadoLiquidacion = {
  rubros: Rubro[];
  totalHaberes: string;
  totalDeducciones: string;
  neto: string;
};

/** Número con 2 decimales en formato es-EC: 1234.5 → "1.234,50". */
export function formatoDecimalEc(value: Decimal.Value): string {
  const [ent, dec] = new Decimal(value).toFixed(2).split('.');
  return `${ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec}`;
}

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

export function calcularVacacionesDetalle(params: {
  remuneracion: number | string;
  fechaIngreso: string;
  fechaSalida: string;
  sueldoPendiente: Decimal;
  diasVacacionesPendientesAnteriores?: number;
  diasGozadosPeriodoEnCurso?: number;
}): {
  pendientes: Decimal;
  proporcional: Decimal;
  descuentoGozados: Decimal;
  total: Decimal;
} {
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
  const bruto = money(remuneraciones.div(24));

  // Los días ya gozados del período en curso se restan a valor por día
  // (remuneración/30); el proporcional no baja de cero.
  const valorDia = new Decimal(params.remuneracion).div(30);
  const diasEnCurso = params.diasGozadosPeriodoEnCurso ?? 0;
  const descuentoGozados = Decimal.min(money(valorDia.times(diasEnCurso)), bruto);
  const proporcional = bruto.minus(descuentoGozados);

  const diasAnt = params.diasVacacionesPendientesAnteriores ?? 0;
  const pendientes = money(valorDia.times(diasAnt));

  return {
    pendientes: assertNonNegative(pendientes, 'Vacaciones pendientes'),
    proporcional: assertNonNegative(proporcional, 'Vacaciones proporcionales'),
    descuentoGozados,
    total: assertNonNegative(money(proporcional.plus(pendientes)), 'Vacaciones'),
  };
}

export function calcularVacaciones(params: {
  remuneracion: number | string;
  fechaIngreso: string;
  fechaSalida: string;
  sueldoPendiente: Decimal;
  diasVacacionesPendientesAnteriores?: number;
  diasGozadosPeriodoEnCurso?: number;
}): Decimal {
  return calcularVacacionesDetalle(params).total;
}

export type VacacionGozadaInput = {
  fechaInicio: string;
  dias: number;
};

export type PeriodoVacaciones = {
  numero: number;
  desde: string;
  hasta: string;
  completo: boolean;
  diasGenerados: number;
  diasGozados: number;
  saldo: number;
};

export type ResultadoVacaciones = {
  fechaCorte: string;
  periodos: PeriodoVacaciones[];
  diasGozadosTotal: number;
  saldoPeriodosCompletos: number;
};

/** 15 días por período + 1 adicional por cada año excedente desde el 6.º (máx. 15). */
export function diasVacacionesPorPeriodo(numeroPeriodo: number): number {
  const adicionales = Math.min(Math.max(numeroPeriodo - 5, 0), 15);
  return 15 + adicionales;
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Períodos anuales de vacaciones desde la fecha de ingreso hasta la fecha de corte
 * (Código del Trabajo, art. 69). Los días gozados se imputan al período completo más
 * antiguo con saldo; el excedente (anticipo de vacaciones) se imputa al período en curso.
 */
export function calcularPeriodosVacaciones(
  fechaIngreso: string,
  fechaCorte: string,
  gozadas: VacacionGozadaInput[],
): ResultadoVacaciones {
  const ingreso = parseDate(fechaIngreso);
  const corte = parseDate(fechaCorte);
  const periodos: PeriodoVacaciones[] = [];

  if (corte >= ingreso) {
    const { aniosCompletos, diasRestantes } = tiempoServicio(
      fechaIngreso,
      fechaCorte,
    );
    for (let n = 1; n <= aniosCompletos; n += 1) {
      periodos.push({
        numero: n,
        desde: toIso(addYears(ingreso, n - 1)),
        hasta: toIso(addDays(addYears(ingreso, n), -1)),
        completo: true,
        diasGenerados: diasVacacionesPorPeriodo(n),
        diasGozados: 0,
        saldo: 0,
      });
    }
    const numero = aniosCompletos + 1;
    const proporcional = new Decimal(diasVacacionesPorPeriodo(numero))
      .times(diasRestantes)
      .div(365)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
      .toNumber();
    periodos.push({
      numero,
      desde: toIso(addYears(ingreso, aniosCompletos)),
      hasta: toIso(corte),
      completo: false,
      diasGenerados: proporcional,
      diasGozados: 0,
      saldo: 0,
    });
  }

  const ordenadas = [...gozadas].sort((a, b) =>
    a.fechaInicio.localeCompare(b.fechaInicio),
  );
  let diasGozadosTotal = new Decimal(0);
  for (const g of ordenadas) {
    let restante = new Decimal(g.dias);
    diasGozadosTotal = diasGozadosTotal.plus(g.dias);
    for (const p of periodos) {
      if (restante.lte(0)) break;
      if (!p.completo) continue;
      const disponible = new Decimal(p.diasGenerados).minus(p.diasGozados);
      if (disponible.lte(0)) continue;
      const imputar = Decimal.min(disponible, restante);
      p.diasGozados = new Decimal(p.diasGozados).plus(imputar).toNumber();
      restante = restante.minus(imputar);
    }
    const enCurso = periodos.find((p) => !p.completo);
    if (restante.gt(0) && enCurso) {
      enCurso.diasGozados = new Decimal(enCurso.diasGozados)
        .plus(restante)
        .toNumber();
    }
  }

  let saldoCompletos = new Decimal(0);
  for (const p of periodos) {
    p.saldo = new Decimal(p.diasGenerados).minus(p.diasGozados).toNumber();
    if (p.completo) saldoCompletos = saldoCompletos.plus(p.saldo);
  }

  return {
    fechaCorte: toIso(corte),
    periodos,
    diasGozadosTotal: diasGozadosTotal.toNumber(),
    saldoPeriodosCompletos: saldoCompletos.toNumber(),
  };
}

/**
 * Causas que generan la bonificación por desahucio (art. 185 CT): desahucio
 * pedido por cualquiera de las partes (la renuncia se tramita como desahucio
 * del trabajador, art. 184), acuerdo entre las partes y despido intempestivo
 * (art. 188, que la suma a la indemnización).
 */
export const CAUSAS_CON_DESAHUCIO: readonly Causa[] = [
  'Renuncia voluntaria',
  'Desahucio',
  'Mutuo acuerdo',
  'Despido intempestivo',
];

/** 25 % de la última remuneración por cada año completo de servicio. */
export function calcularDesahucio(params: {
  remuneracion: number | string;
  fechaIngreso: string;
  fechaSalida: string;
  causa: Causa;
}): Decimal {
  if (!CAUSAS_CON_DESAHUCIO.includes(params.causa)) return money(0);
  const { aniosCompletos } = tiempoServicio(params.fechaIngreso, params.fechaSalida);
  return assertNonNegative(
    money(new Decimal(params.remuneracion).times(0.25).times(aniosCompletos)),
    'Desahucio',
  );
}

/**
 * Fondo de reserva del mes de salida (art. 196 CT): 8,33 % del sueldo pendiente
 * desde el segundo año de servicio. Solo entra en la liquidación si está
 * mensualizado; si no, el empleador lo deposita en el IESS.
 */
export function calcularFondosReserva(params: {
  fechaIngreso: string;
  fechaSalida: string;
  sueldoPendiente: Decimal;
  mensualizados: boolean;
}): Decimal {
  if (!params.mensualizados) return money(0);
  const { aniosCompletos } = tiempoServicio(params.fechaIngreso, params.fechaSalida);
  if (aniosCompletos < 1) return money(0);
  return assertNonNegative(
    money(params.sueldoPendiente.times(0.0833)),
    'Fondos de reserva',
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
  origen: 'manual' | 'obligacion' = 'manual',
): Rubro[] {
  if (!items?.length) return [];
  return items.map((item) => {
    const valor = assertNonNegative(money(item.valor), item.concepto);
    return {
      concepto: item.concepto,
      tipo,
      valor: valor.toFixed(2),
      formula: item.justificacion,
      origen,
      ...(item.referenciaId !== undefined ? { referenciaId: item.referenciaId } : {}),
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
  const vacaciones = calcularVacacionesDetalle({
    remuneracion: entradas.remuneracion,
    fechaIngreso: entradas.fechaIngreso,
    fechaSalida: entradas.fechaSalida,
    sueldoPendiente,
    diasVacacionesPendientesAnteriores:
      entradas.diasVacacionesPendientesAnteriores,
    diasGozadosPeriodoEnCurso: entradas.diasGozadosPeriodoEnCurso,
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
  const fondosReserva = calcularFondosReserva({
    fechaIngreso: entradas.fechaIngreso,
    fechaSalida: entradas.fechaSalida,
    sueldoPendiente,
    mensualizados: entradas.fondosReservaMensualizados ?? false,
  });
  const iess = calcularAporteIess(sueldoPendiente);
  const diasEnCurso = entradas.diasGozadosPeriodoEnCurso ?? 0;

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
      valor: vacaciones.total.toFixed(2),
      formula:
        `${entradas.diasVacacionesPendientesAnteriores ?? 0} días de saldo × remuneración/30 (${formatoDecimalEc(vacaciones.pendientes)}) + remuneraciones del período en curso/24` +
        (diasEnCurso > 0
          ? ` − ${diasEnCurso} días gozados × remuneración/30 (${formatoDecimalEc(vacaciones.descuentoGozados)}) = ${formatoDecimalEc(vacaciones.proporcional)}`
          : ` (${formatoDecimalEc(vacaciones.proporcional)})`),
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
      formula: '25% × remuneración × años completos de servicio (art. 185)',
      origen: 'auto',
    },
    {
      concepto: 'Fondos de reserva',
      tipo: 'haber',
      valor: fondosReserva.toFixed(2),
      formula: entradas.fondosReservaMensualizados
        ? '8,33% × sueldo pendiente (desde el 2.º año, mensualizado)'
        : 'no mensualizado: se deposita en el IESS',
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
    ...mapManuales(entradas.obligaciones, 'deduccion', 'obligacion'),
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
