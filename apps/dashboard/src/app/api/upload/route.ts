import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { isAdmin } from "@/lib/auth";
import { kindFromFileName, slugify } from "@/lib/format";
import { MAX_UPLOAD_BYTES, MODULES } from "@/lib/limits";
import { uploadPath } from "@/lib/store";
import type { ModuleSlug } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = (status: number, error: string) => Response.json({ ok: false, error }, { status });

/** Recibe un archivo (multipart) y lo guarda en el volumen: uploads/<módulo>/<marca>-<nombre>.<ext>. */
export async function POST(req: Request) {
  if (!(await isAdmin())) return fail(401, "No autorizado.");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail(400, "Solicitud inválida.");
  }
  const file = form.get("file");
  const module = String(form.get("module") ?? "") as ModuleSlug;

  if (!(file instanceof File) || file.size === 0) return fail(400, "Selecciona un archivo.");
  if (!MODULES.includes(module)) return fail(400, "Módulo inválido.");
  if (file.size > MAX_UPLOAD_BYTES) return fail(413, "El archivo supera el tamaño permitido.");
  if (!kindFromFileName(file.name)) return fail(415, "Formato no soportado.");

  const dot = file.name.lastIndexOf(".");
  const base = slugify(dot > 0 ? file.name.slice(0, dot) : file.name) || "archivo";
  const ext = dot > 0 ? file.name.slice(dot).toLowerCase().replace(/[^.a-z0-9]/g, "") : "";
  const rel = `${module}/${Date.now()}-${base}${ext}`;

  const abs = uploadPath(rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, Buffer.from(await file.arrayBuffer()));
  return Response.json({ ok: true, path: rel });
}
