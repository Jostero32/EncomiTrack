/**
 * Identidad visual compartida por la interfaz, los PDF y el Excel.
 * Los mismos valores están declarados como tokens en `src/app/globals.css`;
 * si cambia un color aquí, actualícelo también allí.
 */
export const BRAND = {
  sistema: "Roles de Pago",
  lema: "Nómina Ecuador",
  colores: {
    azul: "#11406f",
    azulOscuro: "#0c3157",
    azulSuave: "#e5edf6",
    rojo: "#ba2b32",
    amarillo: "#e8b406",
    blanco: "#f1edea",
    tinta: "#1b2533",
    gris: "#66615c",
    borde: "#ddd6cf",
    filaAlterna: "#f7f4f1",
  },
} as const;

/** Color en formato ARGB que usa exceljs. */
export const argb = (hex: string) => `FF${hex.replace("#", "").toUpperCase()}`;
