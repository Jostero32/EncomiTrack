import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SegmentoNav {
  href: string;
  label: string;
  icon: LucideIcon;
  activo: boolean;
}

/** Pestañas que navegan entre vistas o secciones de una misma pantalla. */
export function SegmentedNav({ items, label, className }: { items: SegmentoNav[]; label: string; className?: string }) {
  return (
    <nav className={cn("mb-6 flex w-fit flex-wrap gap-1 rounded-lg border bg-card p-1 shadow-xs", className)} aria-label={label}>
      {items.map(({ href, label: texto, icon: Icon, activo }) => (
        <Link
          key={href}
          href={href}
          aria-current={activo ? "page" : undefined}
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            activo ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Icon className="size-4" /> {texto}
        </Link>
      ))}
    </nav>
  );
}
