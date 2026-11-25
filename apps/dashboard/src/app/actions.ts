"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ADMIN_COOKIE, requireAdmin, safeEqual, sessionToken } from "@/lib/auth";
import { crudEnabled, env } from "@/lib/env";
import { slugify } from "@/lib/format";
import { KINDS, MODULES } from "@/lib/limits";
import { BASE_PATH } from "@/lib/paths";
import { addStored, removeStored, removeUpload } from "@/lib/store";
import type { DocKind, Highlight, ModuleSlug } from "@/lib/types";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

// ── Sesión de administración ────────────────────────────────────────────────
export async function loginAdmin(passcode: string): Promise<ActionResult> {
  if (!crudEnabled) {
    return { ok: false, error: "La gestión requiere configurar ADMIN_PASSCODE y SESSION_SECRET." };
  }
  if (!safeEqual(passcode.trim(), env.adminPasscode)) {
    return { ok: false, error: "Clave incorrecta." };
  }
  (await cookies()).set(ADMIN_COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: env.cookieSecure,
    // Cookie limitada a la subruta del dashboard: no la ven ni la pisan otras apps del dominio
    path: BASE_PATH || "/",
    maxAge: 60 * 60 * 8,
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function logoutAdmin(): Promise<void> {
  (await cookies()).delete({ name: ADMIN_COOKIE, path: BASE_PATH || "/" });
  revalidatePath("/", "layout");
}

// ── Registro (el archivo ya se subió con POST /api/upload) ──────────────────
export interface NewDocumentInput {
  title: string;
  module: ModuleSlug;
  parcial: 1 | 2;
  deliverableType: string;
  modality?: string;
  date?: string;
  summary?: string;
  highlights?: Highlight[];
  kind: DocKind;
  storagePath?: string | null;
  externalUrl?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
}

export async function registerDocument(input: NewDocumentInput): Promise<ActionResult> {
  try {
    await requireAdmin();
    const title = input.title?.trim();
    if (!title) throw new Error("El título es obligatorio.");
    if (!MODULES.includes(input.module)) throw new Error("Módulo inválido.");
    if (![1, 2].includes(input.parcial)) throw new Error("Parcial inválido.");
    if (!KINDS.includes(input.kind)) throw new Error("Tipo de archivo no soportado.");
    if (!input.storagePath && !input.externalUrl) throw new Error("Falta el archivo o el enlace.");
    if (input.externalUrl && !/^https?:\/\//i.test(input.externalUrl)) throw new Error("El enlace debe iniciar con http(s)://");

    await addStored({
      id: randomUUID(),
      slug: `${slugify(title)}-${Date.now().toString(36)}`,
      title,
      module: input.module,
      parcial: input.parcial,
      deliverableType: input.deliverableType?.trim() || "Documento",
      modality: input.modality?.trim() || null,
      date: input.date?.trim() || null,
      summary: input.summary?.trim() || null,
      highlights: (input.highlights ?? []).filter((h) => h.label.trim() && h.value.trim()),
      kind: input.kind,
      storagePath: input.storagePath ?? null,
      externalUrl: input.externalUrl?.trim() || null,
      mimeType: input.mimeType ?? null,
      sizeBytes: input.sizeBytes ?? null,
      createdAt: new Date().toISOString(),
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    // Si el registro falla, no se deja el archivo huérfano en el volumen.
    if (input.storagePath) await removeUpload(input.storagePath).catch(() => undefined);
    return { ok: false, error: (e as Error).message };
  }
}

export async function deleteDocument(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await removeStored(id);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
