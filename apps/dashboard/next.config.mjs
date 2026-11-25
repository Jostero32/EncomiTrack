import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

// Ruta pública de la app (ej. https://midominio.com/emprendimiento-dashboard).
// Se fija en BUILD; BASE_PATH="" la sirve en la raíz.
const basePath = (process.env.BASE_PATH ?? "/emprendimiento-dashboard").replace(/\/+$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  outputFileTracingRoot: root,
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },
  webpack: (config) => {
    // pdf.js declara "canvas" como dependencia opcional de Node; en el navegador no se usa.
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
