"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { actualizarParametro } from "@/lib/repo";

export async function editarParametro(
  id: number,
  valor: string,
  vigenteDesdePeriodo: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (!/^\d{4}-\d{2}$/.test(vigenteDesdePeriodo)) return { ok: false, error: "Seleccione el periodo de vigencia" };
    actualizarParametro(getDb(), id, valor, `${vigenteDesdePeriodo}-01`);
    revalidatePath("/parametros");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
