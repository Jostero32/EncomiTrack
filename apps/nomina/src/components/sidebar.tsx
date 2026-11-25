"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND } from "@/lib/brand";
import { MENU } from "@/lib/navegacion";
import { cn } from "@/lib/utils";

export interface MarcaEmpresa {
  nombre: string;
  logoUrl: string;
  /** Falso cuando el logo cargado ya incluye el nombre de la empresa. */
  mostrarNombre: boolean;
}

/** Franja con los colores de marca (azul, amarillo, rojo). */
function FranjaMarca({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-1", className)} aria-hidden="true">
      <span className="flex-[3] bg-primary" />
      <span className="flex-1 bg-gold" />
      <span className="flex-1 bg-accent" />
    </div>
  );
}

function Logo({ empresa, compacto = false }: { empresa: MarcaEmpresa; compacto?: boolean }) {
  return (
    <Link href="/" className="flex min-w-0 items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element -- el logo se sirve desde la base de datos */}
      <img
        src={empresa.logoUrl}
        alt={empresa.nombre}
        className={cn(
          "w-auto shrink-0 object-contain",
          compacto ? "h-7 max-w-32" : empresa.mostrarNombre ? "h-9 max-w-24" : "h-10 max-w-44",
        )}
      />
      {(empresa.mostrarNombre || compacto) && (
        <span className="min-w-0 leading-tight">
          {empresa.mostrarNombre && <span className="block truncate text-sm font-semibold">{empresa.nombre}</span>}
          <span className="block truncate text-xs text-muted-foreground">{BRAND.sistema}</span>
        </span>
      )}
    </Link>
  );
}

export function Sidebar({ empresa }: { empresa: MarcaEmpresa }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const items = MENU.flatMap((grupo) => grupo.items);

  return (
    <>
      {/* Escritorio */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-card md:flex">
        <FranjaMarca />
        <div className="flex h-[4.25rem] items-center border-b px-5">
          <Logo empresa={empresa} />
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto p-3">
          {MENU.map((grupo, i) => (
            <div key={grupo.titulo ?? i} className="space-y-0.5">
              {grupo.titulo && (
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
                  {grupo.titulo}
                </p>
              )}
              {grupo.items.map(({ href, label, icon: Icon }) => {
                const activo = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={activo ? "page" : undefined}
                    className={cn(
                      "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      activo ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {activo && <span className="absolute inset-y-1.5 left-0 w-1 rounded-full bg-gold" aria-hidden="true" />}
                    <Icon className="size-4" />
                    {label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <p className="border-t px-5 py-3 text-[11px] text-muted-foreground">{BRAND.lema} · CT · LOSEP · LOEP</p>
      </aside>

      {/* Móvil */}
      <header className="sticky top-0 z-30 border-b bg-card md:hidden">
        <FranjaMarca />
        <div className="flex h-12 items-center px-4">
          <Logo empresa={empresa} compacto />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2">
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium",
                isActive(href) ? "bg-primary-soft text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </Link>
          ))}
        </nav>
      </header>
    </>
  );
}
