/**
 * Prefijo de la app (basePath de Next.js). Se fija en build desde next.config.mjs.
 * `<Link>` y el router ya lo añaden solos; usar `asset()` para <Image>/<img>, fetch,
 * URLs de archivos y metadatos.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function asset(path: string): string {
  return `${BASE_PATH}${path}`;
}
