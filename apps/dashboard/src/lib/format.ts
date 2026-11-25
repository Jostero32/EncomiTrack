import type { DocKind } from "./types";

export function formatBytes(bytes: number | null | undefined): string | null {
  if (!bytes) return null;
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export const kindLabel: Record<DocKind, string> = {
  pdf: "PDF",
  xlsx: "Hoja de cálculo",
  csv: "CSV",
  docx: "Documento Word",
  image: "Imagen",
  video: "Video",
  link: "Enlace",
};

export function kindFromFileName(name: string): DocKind | null {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (ext === "pdf") return "pdf";
  if (["xlsx", "xls", "xlsm"].includes(ext)) return "xlsx";
  if (ext === "csv") return "csv";
  if (ext === "docx") return "docx";
  if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)) return "image";
  if (["mp4", "webm", "mov", "m4v"].includes(ext)) return "video";
  return null;
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Resuelve URLs de video embebibles (Google Drive / YouTube) o devuelve null si es archivo directo. */
export function videoEmbedUrl(url: string | null): string | null {
  if (!url) return null;
  const drive = url.match(/drive\.google\.com\/file\/d\/([^/?#]+)/);
  if (drive) return `https://drive.google.com/file/d/${drive[1]}/preview`;
  const yt =
    url.match(/youtu\.be\/([\w-]{6,})/) ||
    url.match(/youtube\.com\/(?:watch\?v=|embed\/|shorts\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0&modestbranding=1&playsinline=1`;
  return null;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}
