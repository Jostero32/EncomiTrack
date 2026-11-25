import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { env } from "@/lib/env";
import { uploadsDir } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Carpetas del semestre (DOCS_ROOT, solo lectura) que pueden servirse. */
const CATALOG_DIRS = ["Primer_Parcial", "Seundo_Parcial", "Segundo_Parcial"];

const MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".csv": "text/csv; charset=utf-8",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
};

export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const segments = (await ctx.params).path.map((s) => decodeURIComponent(s));
  if (!segments.length) return new Response("No encontrado", { status: 404 });

  // uploads/... → volumen de documentos subidos; Primer_Parcial/... → material del catálogo.
  let root: string;
  let rest: string[];
  if (segments[0] === "uploads") {
    root = uploadsDir();
    rest = segments.slice(1);
  } else if (CATALOG_DIRS.includes(segments[0])) {
    root = path.resolve(process.cwd(), env.docsRoot);
    rest = segments;
  } else {
    return new Response("No encontrado", { status: 404 });
  }
  const abs = path.resolve(root, ...rest);
  if (!abs.startsWith(root + path.sep)) return new Response("Ruta inválida", { status: 400 });

  let size: number;
  try {
    const info = await stat(abs);
    if (!info.isFile()) throw new Error();
    size = info.size;
  } catch {
    return new Response("No encontrado", { status: 404 });
  }

  const type = MIME[path.extname(abs).toLowerCase()] ?? "application/octet-stream";
  const baseHeaders = {
    "Content-Type": type,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=3600",
    "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(path.basename(abs))}`,
  };

  const range = req.headers.get("range");
  const m = range?.match(/bytes=(\d*)-(\d*)/);
  if (m) {
    const start = m[1] ? Number(m[1]) : Math.max(size - Number(m[2]), 0);
    const end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
    if (start > end || start >= size) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    const stream = Readable.toWeb(createReadStream(abs, { start, end })) as ReadableStream;
    return new Response(stream, {
      status: 206,
      headers: { ...baseHeaders, "Content-Length": String(end - start + 1), "Content-Range": `bytes ${start}-${end}/${size}` },
    });
  }

  const stream = Readable.toWeb(createReadStream(abs)) as ReadableStream;
  return new Response(stream, { headers: { ...baseHeaders, "Content-Length": String(size) } });
}
