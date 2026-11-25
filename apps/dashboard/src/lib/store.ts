import "server-only";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "./env";
import type { DocKind, Highlight, ModuleSlug } from "./types";

/**
 * Almacén de los documentos subidos desde la interfaz.
 * Reemplaza a Supabase: un índice JSON y una carpeta de archivos dentro de DATA_DIR,
 * que en Docker es un volumen. El catálogo del semestre (data/catalog.json) no pasa por aquí.
 */
export interface StoredDoc {
  id: string;
  slug: string;
  title: string;
  module: ModuleSlug;
  parcial: 1 | 2;
  deliverableType: string;
  modality: string | null;
  date: string | null;
  summary: string | null;
  highlights: Highlight[];
  kind: DocKind;
  /** Ruta relativa a uploads/, p. ej. "tributario/1732500000000-factura.pdf". */
  storagePath: string | null;
  externalUrl: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
}

const root = () => path.resolve(process.cwd(), env.dataDir);
const indexFile = () => path.join(root(), "documents.json");
export const uploadsDir = () => path.join(root(), "uploads");

// Las escrituras se encadenan para que dos subidas simultáneas no se pisen el índice.
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

export async function listStored(): Promise<StoredDoc[]> {
  try {
    return JSON.parse(await readFile(indexFile(), "utf8")) as StoredDoc[];
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}

async function save(docs: StoredDoc[]): Promise<void> {
  await mkdir(root(), { recursive: true });
  const tmp = `${indexFile()}.tmp`;
  await writeFile(tmp, JSON.stringify(docs, null, 2), "utf8");
  await rename(tmp, indexFile()); // reemplazo atómico: nunca queda un índice a medias
}

export function addStored(doc: StoredDoc): Promise<void> {
  return serial(async () => {
    const docs = await listStored();
    docs.push(doc);
    await save(docs);
  });
}

export function removeStored(id: string): Promise<void> {
  return serial(async () => {
    const docs = await listStored();
    const doc = docs.find((d) => d.id === id);
    if (!doc) throw new Error("Documento no encontrado.");
    await save(docs.filter((d) => d.id !== id));
    if (doc.storagePath) await removeUpload(doc.storagePath);
  });
}

/** Ruta absoluta de un archivo subido, validando que no salga de uploads/. */
export function uploadPath(rel: string): string {
  const base = uploadsDir();
  const abs = path.resolve(base, rel);
  if (!abs.startsWith(base + path.sep)) throw new Error("Ruta inválida.");
  return abs;
}

export async function removeUpload(rel: string): Promise<void> {
  await unlink(uploadPath(rel)).catch(() => undefined);
}
