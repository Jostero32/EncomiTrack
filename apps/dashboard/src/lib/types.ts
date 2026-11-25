export type ModuleSlug = "emprendimiento" | "tributario" | "remuneraciones" | "liquidacion";
export type DocKind = "pdf" | "xlsx" | "csv" | "docx" | "image" | "video" | "link";

export interface Highlight {
  label: string;
  value: string;
}

export interface ModuleInfo {
  slug: ModuleSlug;
  number: number;
  title: string;
  tagline: string;
  description: string;
  icon: string;
}

export interface Doc {
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
  /** URL del archivo para previsualizar (Storage público o ruta local /api/files). */
  fileUrl: string | null;
  /** Recurso vinculado (video de Drive, Kahoot, OneDrive, etc.). */
  externalUrl: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  featured: boolean;
  /** Solo los documentos subidos desde la interfaz pueden eliminarse (el catálogo es fijo). */
  deletable: boolean;
}

export interface SystemInfo {
  slug: string;
  module: ModuleSlug;
  title: string;
  url: string;
  description: string;
  source: string;
}

export interface CourseInfo {
  name: string;
  level: string;
  faculty: string;
  career: string;
  cycle: string;
  teacher: string;
  team: string[];
  venture: string;
}

export type DataMode = "local";

export interface DataSnapshot {
  mode: DataMode;
  documents: Doc[];
  warning?: string;
}

/** Elemento que puede abrirse en el previsualizador: un documento o un sistema embebido. */
export type Previewable =
  | { type: "doc"; doc: Doc; moduleTitle: string }
  | { type: "system"; system: SystemInfo; moduleTitle: string };
