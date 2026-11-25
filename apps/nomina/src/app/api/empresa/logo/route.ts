import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { LOGO_MAX_BYTES, TIPOS_LOGO, logoActual, normalizarLogo } from "@/lib/empresa-logo";
import { guardarLogoEmpresa } from "@/lib/repo";

export async function GET() {
  const logo = await logoActual(getDb());
  return new Response(new Uint8Array(logo.png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "no-cache" },
  });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const archivo = form.get("logo");
  if (!(archivo instanceof File)) return Response.json({ error: "Seleccione un archivo" }, { status: 400 });
  if (!TIPOS_LOGO.includes(archivo.type)) {
    return Response.json({ error: "Formato no admitido. Use PNG, JPG, WebP o SVG." }, { status: 400 });
  }
  if (archivo.size > LOGO_MAX_BYTES) return Response.json({ error: "El archivo supera los 5 MB" }, { status: 400 });
  try {
    const logo = await normalizarLogo(Buffer.from(await archivo.arrayBuffer()));
    guardarLogoEmpresa(getDb(), logo);
  } catch {
    return Response.json({ error: "No se pudo leer la imagen" }, { status: 400 });
  }
  revalidatePath("/", "layout");
  return Response.json({ ok: true });
}

export async function DELETE() {
  guardarLogoEmpresa(getDb(), null);
  revalidatePath("/", "layout");
  return Response.json({ ok: true });
}
