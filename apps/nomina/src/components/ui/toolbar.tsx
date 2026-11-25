import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/form";
import { cn } from "@/lib/utils";

/** Barra superior de una tabla: búsqueda, filtros y un resumen alineado a la derecha. */
export function Toolbar({
  children,
  resumen,
  className,
}: {
  children: React.ReactNode;
  resumen?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3 border-b p-4", className)}>
      {children}
      {resumen !== undefined && <span className="ml-auto text-xs text-muted-foreground">{resumen}</span>}
    </div>
  );
}

export function SearchInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn("relative w-full max-w-sm", className)}>
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input className="pl-9" {...props} />
    </div>
  );
}
