import {
  BriefcaseBusiness,
  Building2,
  Calculator,
  ClipboardList,
  History,
  LayoutDashboard,
  Settings2,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface Seccion {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Secciones de la aplicación: el menú y los encabezados de página usan los mismos íconos. */
export const SECCIONES = {
  panel: { href: "/", label: "Panel", icon: LayoutDashboard },
  cargos: { href: "/cargos", label: "Cargos", icon: BriefcaseBusiness },
  empleados: { href: "/empleados", label: "Empleados", icon: Users },
  organizacion: { href: "/organizacion", label: "Organización", icon: Building2 },
  novedades: { href: "/novedades", label: "Novedades", icon: ClipboardList },
  generar: { href: "/generar", label: "Generar rol", icon: Calculator },
  historial: { href: "/historial", label: "Historial", icon: History },
  configuracion: { href: "/parametros", label: "Configuración", icon: Settings2 },
} satisfies Record<string, Seccion>;

export const MENU: { titulo: string | null; items: Seccion[] }[] = [
  { titulo: null, items: [SECCIONES.panel] },
  { titulo: "Personal", items: [SECCIONES.cargos, SECCIONES.empleados, SECCIONES.organizacion] },
  { titulo: "Nómina", items: [SECCIONES.novedades, SECCIONES.generar, SECCIONES.historial] },
  { titulo: "Sistema", items: [SECCIONES.configuracion] },
];
