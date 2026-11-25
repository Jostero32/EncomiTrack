/** Utilidades de periodos 'YYYY-MM' y fechas 'YYYY-MM-DD' (sin zonas horarias). */

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function isPeriodo(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function periodoActual(today = new Date()): string {
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

export function hoyISO(today = new Date()): string {
  return `${periodoActual(today)}-${String(today.getDate()).padStart(2, "0")}`;
}

export function sumarMeses(periodo: string, n: number): string {
  const [y, m] = periodo.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

export function periodoAnterior(today = new Date()): string {
  return sumarMeses(periodoActual(today), -1);
}

export function esPeriodoFuturo(periodo: string, today = new Date()): boolean {
  return periodo > periodoActual(today);
}

export function inicioPeriodo(periodo: string): string {
  return `${periodo}-01`;
}

export function finPeriodo(periodo: string): string {
  const siguiente = sumarMeses(periodo, 1);
  return diaAnterior(`${siguiente}-01`);
}

export function nombrePeriodo(periodo: string): string {
  const [y, m] = periodo.split("-").map(Number);
  return `${MESES[m - 1]} ${y}`;
}

/** Fecha ISO legible: "ene. 2026" si es inicio de mes, "15 ene. 2026" en otro caso. */
export function fechaCorta(fecha: string): string {
  const [y, m, d] = fecha.split("-").map(Number);
  const mes = `${MESES[m - 1].slice(0, 3).toLowerCase()}.`;
  return d === 1 ? `${mes} ${y}` : `${d} ${mes} ${y}`;
}

/** Día anterior a una fecha ISO. */
export function diaAnterior(fecha: string): string {
  const [y, m, d] = fecha.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d - 1));
  return dt.toISOString().slice(0, 10);
}

/** Suma años a una fecha ISO (29-feb pasa a 1-mar en años no bisiestos). */
export function sumarAnios(fecha: string, anios: number): string {
  const [y, m, d] = fecha.split("-").map(Number);
  const dt = new Date(Date.UTC(y + anios, m - 1, d));
  return dt.toISOString().slice(0, 10);
}
