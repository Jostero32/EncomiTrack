import raw from "@data/catalog.json";
import type { CourseInfo, ModuleInfo, ModuleSlug, SystemInfo, DocKind, Highlight } from "./types";

export interface CatalogDoc {
  slug: string;
  title: string;
  module: ModuleSlug;
  parcial: 1 | 2;
  deliverableType: string;
  modality?: string;
  date?: string;
  kind: DocKind;
  file?: string;
  externalUrl?: string;
  featured?: boolean;
  summary?: string;
  highlights?: Highlight[];
}

const catalog = raw as unknown as {
  course: CourseInfo;
  modules: ModuleInfo[];
  documents: CatalogDoc[];
  systems: SystemInfo[];
};

export const course = catalog.course;
export const modules = catalog.modules;
export const catalogDocuments = catalog.documents;
export const systems = catalog.systems;

export function getModule(slug: string): ModuleInfo | undefined {
  return modules.find((m) => m.slug === slug);
}

export function moduleTitle(slug: ModuleSlug): string {
  return getModule(slug)?.title ?? slug;
}
