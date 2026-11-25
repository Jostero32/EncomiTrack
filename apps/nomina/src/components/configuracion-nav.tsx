"use client";

import { usePathname } from "next/navigation";
import { BookOpen, Building, Calculator, ListTree } from "lucide-react";
import { SegmentedNav } from "@/components/ui/segmented-nav";

const SECCIONES = [
  { href: "/parametros/empresa", label: "Empresa", icon: Building, exacta: true },
  { href: "/parametros", label: "Cálculo de nómina", icon: Calculator, exacta: true },
  { href: "/parametros/escalas", label: "Catálogo salarial", icon: ListTree, exacta: false },
  { href: "/parametros/guia-nomina", label: "Guía de nómina", icon: BookOpen, exacta: true },
];

export function ConfiguracionNav() {
  const pathname = usePathname();
  return (
    <SegmentedNav
      label="Secciones de configuración"
      items={SECCIONES.map(({ exacta, ...item }) => ({
        ...item,
        activo: exacta ? pathname === item.href : pathname.startsWith(item.href),
      }))}
    />
  );
}
