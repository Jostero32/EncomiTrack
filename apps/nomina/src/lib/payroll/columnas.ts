import { valorConcepto } from "./engine";
import type { FilaRol } from "./service";

export interface ColumnaNomina {
  clave: string;
  nombre: string;
  grupo: string;
  valor: (fila: FilaRol) => number;
}
const concepto = (codigo: string) => (f: FilaRol) => valorConcepto(f.resultado, codigo);

/** Un mismo desglose para pantalla, Excel y PDF. */
export const COLUMNAS_NOMINA: ColumnaNomina[] = [
  { clave: "sueldo", nombre: "Sueldo", grupo: "Ingresos del empleado", valor: concepto("sueldo") },
  { clave: "nocturnas", nombre: "Recargo nocturno", grupo: "Ingresos del empleado", valor: concepto("horas_nocturnas") },
  { clave: "suplementarias", nombre: "H. suplementarias", grupo: "Ingresos del empleado", valor: concepto("horas_suplementarias") },
  { clave: "extraordinarias", nombre: "H. extraordinarias", grupo: "Ingresos del empleado", valor: concepto("horas_extraordinarias") },
  { clave: "otros", nombre: "Otros ingresos", grupo: "Ingresos del empleado", valor: concepto("otros_ingresos") },
  { clave: "decimo13", nombre: "13.º mensual", grupo: "Ingresos del empleado", valor: concepto("decimo_tercero") },
  { clave: "decimo14", nombre: "14.º mensual", grupo: "Ingresos del empleado", valor: concepto("decimo_cuarto") },
  { clave: "pago13", nombre: "Pago 13.º acumulado", grupo: "Ingresos del empleado", valor: concepto("pago_decimo_tercero_acumulado") },
  { clave: "pago14", nombre: "Pago 14.º acumulado", grupo: "Ingresos del empleado", valor: concepto("pago_decimo_cuarto_acumulado") },
  { clave: "fondos", nombre: "F. reserva directos", grupo: "Ingresos del empleado", valor: concepto("fondos_reserva") },
  { clave: "ingresos", nombre: "Total ingresos", grupo: "Ingresos del empleado", valor: f => f.resultado.totalIngresosCent },
  { clave: "base", nombre: "Base IESS", grupo: "Descuentos del empleado", valor: f => f.resultado.baseIessCent },
  { clave: "personal", nombre: "IESS empleado", grupo: "Descuentos del empleado", valor: concepto("aporte_iess_personal") },
  { clave: "renta", nombre: "Impuesto a la renta", grupo: "Descuentos del empleado", valor: concepto("impuesto_renta") },
  { clave: "descuentos", nombre: "Otros descuentos", grupo: "Descuentos del empleado", valor: concepto("descuentos") },
  { clave: "egresos", nombre: "Total descuentos", grupo: "Descuentos del empleado", valor: f => f.resultado.totalEgresosCent },
  { clave: "neto", nombre: "Neto a recibir", grupo: "Pago", valor: f => f.resultado.netoCent },
  { clave: "patronal", nombre: "IESS empleador", grupo: "Aportes al IESS", valor: f => f.resultado.provisiones.aportePatronalCent },
  { clave: "totalIess", nombre: "Total aportes IESS", grupo: "Aportes al IESS", valor: f => concepto("aporte_iess_personal")(f) + f.resultado.provisiones.aportePatronalCent },
];

export const COLUMNAS_OBLIGACIONES: ColumnaNomina[] = [
  { clave: "base", nombre: "Base IESS", grupo: "Aportación al IESS", valor: f => f.resultado.baseIessCent },
  { clave: "personal", nombre: "IESS empleado", grupo: "Aportación al IESS", valor: concepto("aporte_iess_personal") },
  { clave: "patronal", nombre: "IESS empleador", grupo: "Aportación al IESS", valor: f => f.resultado.provisiones.aportePatronalCent },
  { clave: "totalIess", nombre: "Total aportes IESS", grupo: "Aportación al IESS", valor: f => concepto("aporte_iess_personal")(f) + f.resultado.provisiones.aportePatronalCent },
  { clave: "frIess", nombre: "F. reserva al IESS", grupo: "Fondos de reserva", valor: f => f.resultado.provisiones.fondosReservaCent },
  { clave: "frDirecto", nombre: "F. reserva directos", grupo: "Fondos de reserva", valor: concepto("fondos_reserva") },
  { clave: "prov13", nombre: "13.º devengado", grupo: "Décimos acumulados", valor: f => f.resultado.provisiones.decimoTerceroCent },
  { clave: "saldo13", nombre: "Saldo 13.º registrado", grupo: "Décimos acumulados", valor: f => f.resultado.beneficios?.decimoTercero.saldoCent ?? 0 },
  { clave: "prov14", nombre: "14.º devengado", grupo: "Décimos acumulados", valor: f => f.resultado.provisiones.decimoCuartoCent },
  { clave: "saldo14", nombre: "Saldo 14.º registrado", grupo: "Décimos acumulados", valor: f => f.resultado.beneficios?.decimoCuarto.saldoCent ?? 0 },
];
