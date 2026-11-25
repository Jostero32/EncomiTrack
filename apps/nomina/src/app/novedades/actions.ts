"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { parseMoneyToCents, parseScaled } from "@/lib/money";
import { isPeriodo } from "@/lib/periodo";
import { guardarNovedades } from "@/lib/repo";
import { leerDescuentosForm, totalDescuentos, type DescuentoForm } from "@/lib/payroll/descuentos";

export interface NovedadForm {
  empleadoId: number;
  horasNocturnas: string;
  horasSuplementarias: string;
  horasExtraordinarias: string;
  otrosIngresos: string;
  descuentos: string;
  descuentosDetalle: DescuentoForm[];
  impuestoRenta: string;
  pagoDecimoTercero: string;
  pagoDecimoCuarto: string;
  observacion: string;
}

function horas(valor: string, campo: string): number {
  const v = valor.trim() || "0";
  const scaled = parseScaled(v, 2);
  if (scaled < 0n) throw new Error(`${campo}: no se permiten valores negativos`);
  if (scaled > 74400n) throw new Error(`${campo}: valor fuera de rango`);
  // horas con 2 decimales exactos (no son dinero)
  return Number(scaled) / 100;
}

function dinero(valor: string, campo: string): number {
  const c = parseMoneyToCents(valor.trim() || "0");
  if (c < 0) throw new Error(`${campo}: no se permiten valores negativos`);
  return c;
}

export async function guardarNovedadesAction(
  periodo: string,
  filas: NovedadForm[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (!isPeriodo(periodo)) return { ok: false, error: "Periodo inválido" };
    const data = filas.map((f) => {
      const descuentosDetalle = leerDescuentosForm(f.descuentosDetalle);
      return {
        empleadoId: f.empleadoId,
        horasNocturnas: horas(f.horasNocturnas, "Horas nocturnas"),
        horasSuplementarias: horas(f.horasSuplementarias, "Horas suplementarias"),
        horasExtraordinarias: horas(f.horasExtraordinarias, "Horas extraordinarias"),
        otrosIngresosCent: dinero(f.otrosIngresos, "Otros ingresos"),
        descuentosCent: totalDescuentos(descuentosDetalle),
        descuentosDetalle,
        impuestoRentaCent: dinero(f.impuestoRenta, "Impuesto a la renta"),
        pagoDecimoTerceroCent: dinero(f.pagoDecimoTercero, "Pago décimo tercero"),
        pagoDecimoCuartoCent: dinero(f.pagoDecimoCuarto, "Pago décimo cuarto"),
        observacion: f.observacion.trim(),
      };
    });
    guardarNovedades(getDb(), periodo, data);
    revalidatePath("/novedades");
    revalidatePath("/generar");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
