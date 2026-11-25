import * as React from "react";
import { Inbox, type LucideIcon } from "lucide-react";
import { TD, TR } from "@/components/ui/table";

/** Mensaje centrado para listas sin resultados. */
export function EmptyState({ icon: Icon = Inbox, children }: { icon?: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground">
      <span className="flex size-10 items-center justify-center rounded-full bg-muted">
        <Icon className="size-5" />
      </span>
      <div>{children}</div>
    </div>
  );
}

/** EmptyState dentro de una tabla. */
export function EmptyRow({ colSpan, icon, children }: { colSpan: number; icon?: LucideIcon; children: React.ReactNode }) {
  return (
    <TR>
      <TD colSpan={colSpan} className="p-0">
        <EmptyState icon={icon}>{children}</EmptyState>
      </TD>
    </TR>
  );
}
