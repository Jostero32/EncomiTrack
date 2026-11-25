"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { calcularPeriodo, generarYGuardar, type CalculoPeriodo } from "@/lib/payroll/service";

type Resultado = { ok: true; calculo: CalculoPeriodo } | { ok: false; error: string };

export async function calcularAction(periodo: string, regimenId?: number): Promise<Resultado> {
  try {
    return { ok: true, calculo: calcularPeriodo(getDb(), periodo, regimenId || undefined) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function guardarAction(periodo: string, regimenId?: number): Promise<Resultado> {
  try {
    const calculo = generarYGuardar(getDb(), periodo, regimenId || undefined);
    revalidatePath("/");
    revalidatePath("/historial");
    return { ok: true, calculo };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
