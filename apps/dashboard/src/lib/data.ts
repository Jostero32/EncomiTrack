import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";
import { cache } from "react";
import { catalogDocuments } from "./catalog";
import { env } from "./env";
import { asset } from "./paths";
import { listStored, type StoredDoc } from "./store";
import type { DataSnapshot, Doc, ModuleSlug } from "./types";

function fileUrl(...parts: string[]): string {
  return asset("/api/files/") + parts.flatMap((p) => p.split("/")).filter(Boolean).map(encodeURIComponent).join("/");
}

/** Documentos del catálogo del semestre; el archivo solo se enlaza si existe en DOCS_ROOT. */
function fromCatalog(): { docs: Doc[]; missing: number } {
  const docsRoot = path.resolve(process.cwd(), env.docsRoot);
  let missing = 0;
  const docs = catalogDocuments.map((d): Doc => {
    const available = d.file ? existsSync(path.join(docsRoot, d.file)) : false;
    if (d.file && !available) missing++;
    return {
      id: d.slug,
      slug: d.slug,
      title: d.title,
      module: d.module,
      parcial: d.parcial,
      deliverableType: d.deliverableType,
      modality: d.modality ?? null,
      date: d.date ?? null,
      summary: d.summary ?? null,
      highlights: d.highlights ?? [],
      kind: d.kind,
      fileUrl: available ? fileUrl(d.file!) : null,
      externalUrl: d.externalUrl ?? null,
      mimeType: null,
      sizeBytes: null,
      featured: Boolean(d.featured),
      deletable: false,
    };
  });
  return { docs, missing };
}

function fromStored(d: StoredDoc): Doc {
  return {
    id: d.id,
    slug: d.slug,
    title: d.title,
    module: d.module,
    parcial: d.parcial,
    deliverableType: d.deliverableType,
    modality: d.modality,
    date: d.date,
    summary: d.summary,
    highlights: d.highlights,
    kind: d.kind,
    fileUrl: d.storagePath ? fileUrl("uploads", d.storagePath) : null,
    externalUrl: d.externalUrl,
    mimeType: d.mimeType,
    sizeBytes: d.sizeBytes,
    featured: false,
    deletable: true,
  };
}

/** Catálogo del semestre + documentos subidos desde la interfaz. */
export const getSnapshot = cache(async (): Promise<DataSnapshot> => {
  const { docs, missing } = fromCatalog();
  let stored: Doc[] = [];
  let warning: string | undefined;
  try {
    stored = (await listStored()).map(fromStored);
  } catch (e) {
    warning = `No se pudo leer el índice de documentos subidos (${(e as Error).message}).`;
  }
  if (!warning && missing > 0) {
    warning = `${missing} documento(s) del catálogo no tienen su archivo en este servidor; se muestra solo su resumen.`;
  }
  return { mode: "local", documents: [...docs, ...stored], warning };
});

export async function getDocumentsByModule(slug: ModuleSlug) {
  const snap = await getSnapshot();
  return { ...snap, documents: snap.documents.filter((d) => d.module === slug) };
}
