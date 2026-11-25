import { parseScaled } from "../money";

export interface DescuentoManual {
  concepto: string;
  valorCent: number;
}

export interface DescuentoForm {
  concepto: string;
  importe: string;
}

export const PREFIJO_DESCUENTO = "descuento_manual_";

/** El detalle es la fuente del total; undefined representa un registro anterior. */
export function resolverDescuentos(totalAnterior: number, detalle?: DescuentoManual[]): DescuentoManual[] {
  const items = detalle ?? (totalAnterior ? [{ concepto: "Otros descuentos", valorCent: totalAnterior }] : []);
  if (!Array.isArray(items) || items.length > 50) throw new Error("Se permiten hasta 50 descuentos por empleado y periodo");
  const normalizados = items.map((item) => {
    const concepto = typeof item?.concepto === "string" ? item.concepto.trim() : "";
    if (!concepto || concepto.length > 120) throw new Error("Cada descuento necesita un concepto de hasta 120 caracteres");
    if (!Number.isSafeInteger(item.valorCent) || item.valorCent <= 0) throw new Error(`Descuento «${concepto}»: ingrese un importe mayor a cero en centavos válidos`);
    return { concepto, valorCent: item.valorCent };
  });
  totalDescuentos(normalizados);
  return normalizados;
}

export function totalDescuentos(detalle: DescuentoManual[]): number {
  const total = detalle.reduce((s, item) => s + BigInt(item.valorCent), 0n);
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("El total de descuentos supera el importe permitido");
  return Number(total);
}

export function leerDescuentosForm(items: DescuentoForm[]): DescuentoManual[] {
  if (!Array.isArray(items)) throw new Error("Detalle de descuentos inválido");
  return resolverDescuentos(0, items.map((item) => {
    const importe = typeof item?.importe === "string" ? item.importe.trim() : "";
    if (!/^\d+(?:[.,]\d{1,2})?$/.test(importe)) throw new Error("Cada descuento necesita un importe positivo con hasta dos decimales");
    return { concepto: item.concepto, valorCent: Number(parseScaled(importe, 2)) };
  }));
}

/** También reconoce el concepto agregado de las copias de roles históricos. */
export function descuentosDelRol(rol: { egresos: { codigo: string; nombre: string; valorCent: number }[] }): DescuentoManual[] {
  return rol.egresos
    .filter(c => (c.codigo === "descuentos" || c.codigo.startsWith(PREFIJO_DESCUENTO)) && c.valorCent !== 0)
    .map(c => ({ concepto: c.nombre, valorCent: c.valorCent }));
}
