/**
 * Prefijo con el que se publica la app (p. ej. "/nominas" detrás de Dokploy);
 * vacío en desarrollo local. Se fija al compilar con NEXT_PUBLIC_BASE_PATH.
 */
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");

/**
 * Next antepone el prefijo solo en <Link> y router.push; las URLs escritas a
 * mano (<a>, <img>, fetch) deben pasar por aquí.
 */
export const conBase = (ruta: string) => `${BASE_PATH}${ruta}`;
