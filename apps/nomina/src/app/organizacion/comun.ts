import type { Empleado } from "@/lib/repo";

/** Color de cada nivel ocupacional (A–E), compartido por ambas vistas del organigrama. */
export const COLORES_NIVEL: Record<string, string> = {
  A: "#7f1d1d",
  B: "#11406f",
  C: "#155e75",
  D: "#4d5f72",
  E: "#6b7280",
};

export function iniciales(empleado: Pick<Empleado, "nombres" | "apellidos">) {
  return `${empleado.nombres.charAt(0)}${empleado.apellidos.charAt(0)}`.toUpperCase();
}
