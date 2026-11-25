import type { DocKind, ModuleSlug } from "./types";

export const MODULES: ModuleSlug[] = ["emprendimiento", "tributario", "remuneraciones", "liquidacion"];
export const KINDS: DocKind[] = ["pdf", "xlsx", "csv", "docx", "image", "video", "link"];

/** Tamaño máximo por archivo subido (el gateway nginx permite un poco más). */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
