import type { NextConfig } from "next";

// Prefijo de publicación (p. ej. /nominas en Dokploy). Debe ser el mismo en
// `next build` y `next start`; sin la variable la app vive en "/".
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  basePath: basePath || undefined,
  serverExternalPackages: ["better-sqlite3", "@react-pdf/renderer", "exceljs", "sharp"],
};

export default nextConfig;
