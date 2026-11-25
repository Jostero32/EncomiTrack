"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { guardarEmpresa, type DatosEmpresa } from "@/lib/repo";

export async function guardarEmpresaAction(form: DatosEmpresa): Promise<{ ok: true } | { ok: false; error: string }> {
  const datos: DatosEmpresa = {
    razonSocial: form.razonSocial.trim(),
    nombreComercial: form.nombreComercial.trim(),
    ruc: form.ruc.trim(),
    direccion: form.direccion.trim(),
    telefono: form.telefono.trim(),
    email: form.email.trim(),
    representanteLegal: form.representanteLegal.trim(),
    mostrarNombreConLogo: !!form.mostrarNombreConLogo,
  };
  if (!datos.razonSocial) return { ok: false, error: "Ingrese la razón social" };
  if (datos.ruc && (!/^\d{13}$/.test(datos.ruc) || datos.ruc.endsWith("000"))) {
    return { ok: false, error: "El RUC debe tener 13 dígitos (p. ej. 1791234567001)" };
  }
  if (datos.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email)) {
    return { ok: false, error: "El correo electrónico no es válido" };
  }
  guardarEmpresa(getDb(), datos);
  revalidatePath("/", "layout");
  return { ok: true };
}
