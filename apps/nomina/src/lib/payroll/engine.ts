/**
 * Motor de cálculo del rol de pagos.
 *
 * Funciones PURAS: no acceden a base de datos. Reciben empleado, novedades y
 * parámetros (como texto, tal cual se guardan en la tabla `parametros`) y
 * devuelven el detalle completo del rol.
 *
 * Reglas de dinero:
 * - Todo importe se calcula en centavos con bigint; nunca con float.
 * - Cada concepto se redondea half-up a centavos al cerrarse.
 * - Ninguna regla depende del régimen en código: los valores por régimen
 *   llegan resueltos en `ParametrosRol`.
 */
import { divRound, formatUSD, parseScaled } from "../money";
import { inicioPeriodo, sumarAnios } from "../periodo";
import { descuentosDelRol, PREFIJO_DESCUENTO, resolverDescuentos, totalDescuentos, type DescuentoManual } from "./descuentos";

/** Claves de parámetros que el motor necesita (valores como texto decimal). */
export const CLAVES_MOTOR = [
  "sbu",
  "iess_aporte_personal",
  "iess_aporte_patronal",
  "fondos_reserva_pct",
  "divisor_horas_mes",
  "recargo_nocturno_pct",
  "recargo_suplementaria_pct",
  "recargo_extraordinaria_pct",
  "limite_suplementarias_mes",
  "limite_suplementarias_dia",
] as const;

export type ClaveMotor = (typeof CLAVES_MOTOR)[number];
export type ParametrosRol = Record<ClaveMotor, string>;

export interface EmpleadoCalculo {
  id: number;
  sueldoBaseCent: number;
  fechaIngreso: string; // YYYY-MM-DD
  mensualiza13: boolean;
  mensualiza14: boolean;
  aplicaFondosReserva: boolean;
  fondosReservaModalidad?: "DIRECTO" | "IESS";
}

export interface NovedadCalculo {
  horasNocturnas: number | string;
  horasSuplementarias: number | string;
  horasExtraordinarias: number | string;
  otrosIngresosCent: number;
  descuentosCent: number;
  descuentosDetalle?: DescuentoManual[];
  impuestoRentaCent?: number;
  pagoDecimoTerceroCent?: number;
  pagoDecimoCuartoCent?: number;
}

export const NOVEDAD_VACIA: NovedadCalculo = {
  horasNocturnas: 0,
  horasSuplementarias: 0,
  horasExtraordinarias: 0,
  otrosIngresosCent: 0,
  descuentosCent: 0,
};

export interface Concepto {
  codigo: string;
  nombre: string;
  valorCent: number;
  detalle?: string;
}

export interface Provisiones {
  decimoTerceroCent: number;
  decimoCuartoCent: number;
  fondosReservaCent: number;
  aportePatronalCent: number;
}

export interface ResultadoRol {
  periodo: string;
  diasTrabajados: number;
  valorHoraCent: number; // solo informativo (redondeado)
  baseIessCent: number;
  ingresos: Concepto[];
  egresos: Concepto[];
  totalIngresosCent: number;
  totalEgresosCent: number;
  netoCent: number;
  provisiones: Provisiones;
  advertencias: string[];
  parametros: ParametrosRol;
  beneficios?: { decimoTercero: SaldoBeneficio; decimoCuarto: SaldoBeneficio };
}

export interface SaldoBeneficio {
  desdePeriodo: string;
  hastaPeriodo: string;
  saldoAnteriorCent: number;
  devengadoCent: number;
  pagadoCent: number;
  saldoCent: number;
}

const DIAS_MES = 30n; // mes comercial
const DIAS_LABORABLES_MES = 22n; // referencia para el promedio diario de suplementarias

/** Días trabajados en el periodo (mes comercial de 30 días). */
export function diasTrabajados(fechaIngreso: string, periodo: string): number {
  const inicio = inicioPeriodo(periodo);
  if (fechaIngreso <= inicio) return 30;
  if (fechaIngreso.slice(0, 7) !== periodo) return 0; // ingresó después del periodo
  const dia = Math.min(Number(fechaIngreso.slice(8, 10)), 30);
  return 30 - dia + 1;
}

/** Días del periodo con derecho a fondos de reserva (a partir del primer aniversario). */
export function diasFondosReserva(fechaIngreso: string, periodo: string): number {
  const aniversario = sumarAnios(fechaIngreso, 1);
  return diasTrabajados(aniversario, periodo);
}

function n(value: bigint): number {
  return Number(value);
}

function validarParametros(p: ParametrosRol) {
  for (const clave of CLAVES_MOTOR) {
    if (p[clave] === undefined || p[clave] === null || String(p[clave]).trim() === "") {
      throw new Error(`Falta el parámetro "${clave}" para el periodo y régimen indicados`);
    }
  }
}

export function calcularRol(
  empleado: EmpleadoCalculo,
  novedad: NovedadCalculo | null,
  parametros: ParametrosRol,
  periodo: string,
): ResultadoRol {
  validarParametros(parametros);
  const nov = novedad ?? NOVEDAD_VACIA;

  const dias = diasTrabajados(empleado.fechaIngreso, periodo);
  if (dias === 0) {
    throw new Error(`El empleado ${empleado.id} no laboraba en el periodo ${periodo}`);
  }
  const D = BigInt(dias);

  // Parámetros escalados a enteros
  const sbu = parseScaled(parametros.sbu, 2); // centavos
  const pctPersonal = parseScaled(parametros.iess_aporte_personal, 2); // 9.45% -> 945 (/10000)
  const pctPatronal = parseScaled(parametros.iess_aporte_patronal, 2);
  const pctFondos = parseScaled(parametros.fondos_reserva_pct, 2);
  const divisor = parseScaled(parametros.divisor_horas_mes, 2); // 240 -> 24000 (/100)
  const recNoct = parseScaled(parametros.recargo_nocturno_pct, 2);
  const recSup = parseScaled(parametros.recargo_suplementaria_pct, 2);
  const recExt = parseScaled(parametros.recargo_extraordinaria_pct, 2);
  const limMes = parseScaled(parametros.limite_suplementarias_mes, 2); // horas ×100
  const limDia = parseScaled(parametros.limite_suplementarias_dia, 2);
  if (divisor <= 0n) throw new Error("El divisor de horas debe ser mayor a cero");

  const S = BigInt(empleado.sueldoBaseCent);
  const hNoct = parseScaled(nov.horasNocturnas || 0, 2); // horas ×100
  const hSup = parseScaled(nov.horasSuplementarias || 0, 2);
  const hExt = parseScaled(nov.horasExtraordinarias || 0, 2);
  const otros = BigInt(nov.otrosIngresosCent || 0);
  const descuentosDetalle = resolverDescuentos(nov.descuentosCent || 0, nov.descuentosDetalle);
  const renta = BigInt(nov.impuestoRentaCent ?? 0);
  const pago13 = BigInt(nov.pagoDecimoTerceroCent ?? 0);
  const pago14 = BigInt(nov.pagoDecimoCuartoCent ?? 0);
  if ([renta, pago13, pago14].some(v => v < 0n)) throw new Error("Los pagos y descuentos no pueden ser negativos");

  // valor_hora = S / divisor  => en centavos: S*100/divisor_escalado
  const valorHora = divRound(S * 100n, divisor);
  const vhTxt = formatUSD(n(valorHora));

  // Ingresos
  const sueldo = divRound(S * D, DIAS_MES);
  // horas × valor_hora × recargo = (h/100) × (S*100/div) × (r/10000)
  const nocturnas = divRound(hNoct * S * recNoct, divisor * 10000n);
  const suplementarias = divRound(hSup * S * (10000n + recSup), divisor * 10000n);
  const extraordinarias = divRound(hExt * S * (10000n + recExt), divisor * 10000n);

  const baseIess = sueldo + nocturnas + suplementarias + extraordinarias + otros;

  const remuneracionComputable = sueldo + nocturnas + suplementarias + extraordinarias + otros;
  const decimoTercero = divRound(remuneracionComputable, 12n);
  const decimoCuarto = divRound(sbu * D, 12n * DIAS_MES);

  const diasFR = empleado.aplicaFondosReserva ? BigInt(diasFondosReserva(empleado.fechaIngreso, periodo)) : 0n;
  const fondos = diasFR > 0n ? divRound(baseIess * pctFondos * diasFR, 10000n * DIAS_MES) : 0n;

  const d13 = empleado.mensualiza13 ? decimoTercero : 0n;
  const d14 = empleado.mensualiza14 ? decimoCuarto : 0n;
  const depositaFondos = empleado.fondosReservaModalidad === "IESS";

  const horasTxt = (h: bigint) => `${(Number(h) / 100).toString()} h`; // solo texto
  const pctTxt = (p: string) => `${p}%`;

  const ingresos: Concepto[] = [
    {
      codigo: "sueldo",
      nombre: "Sueldo",
      valorCent: n(sueldo),
      detalle: dias < 30 ? `${dias}/30 días de ${formatUSD(empleado.sueldoBaseCent)}` : "30 días",
    },
    {
      codigo: "horas_nocturnas",
      nombre: "Recargo nocturno",
      valorCent: n(nocturnas),
      detalle: hNoct > 0n ? `${horasTxt(hNoct)} × ${vhTxt} × ${pctTxt(parametros.recargo_nocturno_pct)}` : undefined,
    },
    {
      codigo: "horas_suplementarias",
      nombre: "Horas suplementarias",
      valorCent: n(suplementarias),
      detalle: hSup > 0n ? `${horasTxt(hSup)} × ${vhTxt} × (1 + ${pctTxt(parametros.recargo_suplementaria_pct)})` : undefined,
    },
    {
      codigo: "horas_extraordinarias",
      nombre: "Horas extraordinarias",
      valorCent: n(extraordinarias),
      detalle: hExt > 0n ? `${horasTxt(hExt)} × ${vhTxt} × (1 + ${pctTxt(parametros.recargo_extraordinaria_pct)})` : undefined,
    },
    { codigo: "otros_ingresos", nombre: "Otros ingresos", valorCent: n(otros) },
    {
      codigo: "decimo_tercero",
      nombre: "Décimo tercero mensualizado",
      valorCent: n(d13),
      detalle: empleado.mensualiza13 ? `${formatUSD(n(remuneracionComputable))} / 12` : "Acumulado: se informa en beneficios, fuera del pago mensual",
    },
    {
      codigo: "decimo_cuarto",
      nombre: "Décimo cuarto mensualizado",
      valorCent: n(d14),
      detalle: empleado.mensualiza14 ? `SBU / 12${dias < 30 ? ` × ${dias}/30` : ""}` : "Acumulado (se provisiona)",
    },
    {
      codigo: "fondos_reserva",
      nombre: "Fondos de reserva",
      valorCent: depositaFondos ? 0 : n(fondos),
      detalle: !empleado.aplicaFondosReserva
        ? "No aplica"
        : diasFR === 0n
          ? "Menos de 1 año de servicio"
          : `${formatUSD(n(baseIess))} × ${pctTxt(parametros.fondos_reserva_pct)}${diasFR < 30n ? ` × ${diasFR}/30` : ""}${depositaFondos ? " · Depósito al IESS: " + formatUSD(n(fondos)) : " · Pago directo"}`,
    },
    { codigo: "pago_decimo_tercero_acumulado", nombre: "Pago de décimo tercero acumulado", valorCent: n(pago13), detalle: "Reduce el saldo acumulado registrado" },
    { codigo: "pago_decimo_cuarto_acumulado", nombre: "Pago de décimo cuarto acumulado", valorCent: n(pago14), detalle: "Reduce el saldo acumulado registrado" },
  ];

  const aportePersonal = divRound(baseIess * pctPersonal, 10000n);
  const egresos: Concepto[] = [
    {
      codigo: "aporte_iess_personal",
      nombre: "Aporte personal IESS",
      valorCent: n(aportePersonal),
      detalle: `${formatUSD(n(baseIess))} × ${pctTxt(parametros.iess_aporte_personal)}`,
    },
    { codigo: "impuesto_renta", nombre: "Impuesto a la renta", valorCent: n(renta), detalle: renta > 0n ? "Retención del periodo registrada en Novedades" : "Sin retención registrada en Novedades" },
    ...descuentosDetalle.map((d, i) => ({ codigo: `${PREFIJO_DESCUENTO}${i + 1}`, nombre: d.concepto, valorCent: d.valorCent, detalle: "Descuento manual registrado en Novedades" })),
  ];

  const totalIngresos = ingresos.reduce((a, c) => a + BigInt(c.valorCent), 0n);
  const totalEgresos = egresos.reduce((a, c) => a + BigInt(c.valorCent), 0n);

  const aportePatronal = divRound(baseIess * pctPatronal, 10000n);

  // Advertencias de horas suplementarias
  const advertencias: string[] = [];
  if (hSup > limMes) {
    advertencias.push(
      `Horas suplementarias (${horasTxt(hSup)}) superan el límite mensual de ${parametros.limite_suplementarias_mes} h`,
    );
  }
  const diasLaborables = divRound(DIAS_LABORABLES_MES * D, DIAS_MES);
  if (hSup > 0n && diasLaborables > 0n && hSup > limDia * diasLaborables) {
    advertencias.push(
      `Horas suplementarias (${horasTxt(hSup)}) superan el límite diario de ${parametros.limite_suplementarias_dia} h ` +
        `en ${diasLaborables} días laborables`,
    );
  }

  return {
    periodo,
    diasTrabajados: dias,
    valorHoraCent: n(valorHora),
    baseIessCent: n(baseIess),
    ingresos,
    egresos,
    totalIngresosCent: n(totalIngresos),
    totalEgresosCent: n(totalEgresos),
    netoCent: n(totalIngresos - totalEgresos),
    provisiones: {
      decimoTerceroCent: empleado.mensualiza13 ? 0 : n(decimoTercero),
      decimoCuartoCent: empleado.mensualiza14 ? 0 : n(decimoCuarto),
      fondosReservaCent: depositaFondos ? n(fondos) : 0,
      aportePatronalCent: n(aportePatronal),
    },
    advertencias,
    parametros,
  };
}

export function valorConcepto(r: ResultadoRol, codigo: string): number {
  if (codigo === "descuentos") return totalDescuentos(descuentosDelRol(r));
  return [...r.ingresos, ...r.egresos].find((c) => c.codigo === codigo)?.valorCent ?? 0;
}
