import "server-only";

// Acceso dinámico (process.env[k]): Next no puede incrustar estas variables en el build,
// así que se leen en runtime desde el entorno del contenedor (docker compose / Dokploy).
export const env = {
  adminPasscode: process.env.ADMIN_PASSCODE ?? "",
  sessionSecret: process.env.SESSION_SECRET ?? "",
  /** Carpeta con Primer_Parcial/ y Seundo_Parcial/ (material del catálogo, solo lectura). */
  docsRoot: process.env.DOCS_ROOT || "..",
  /** Carpeta escribible: índice documents.json y uploads/ (volumen de Docker). */
  dataDir: process.env.DATA_DIR || ".runtime",
  cookieSecure: process.env.COOKIE_SECURE === "true",
};

/** La gestión (subir y eliminar) se habilita solo con clave y secreto de sesión. */
export const crudEnabled = Boolean(env.adminPasscode && env.sessionSecret);
