import * as React from "react";
import { cn } from "@/lib/utils";

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}

export function THead(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className="border-b bg-muted/60" {...props} />;
}

export function TBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("[&>tr:nth-child(even)]:bg-muted/40", className)} {...props} />;
}

export function TFoot({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tfoot className={cn("border-t-2 bg-muted/70 font-semibold", className)} {...props} />;
}

export function TR({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("border-b last:border-0", className)} {...props} />;
}

export function TH({ className, numeric, ...props }: React.ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <th
      className={cn(
        "h-10 whitespace-nowrap px-3 text-left align-middle text-xs font-semibold uppercase tracking-wide text-muted-foreground",
        numeric && "text-right",
        className,
      )}
      {...props}
    />
  );
}

export function TD({ className, numeric, ...props }: React.TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return <td className={cn("px-3 py-2.5 align-middle", numeric && "tabular whitespace-nowrap text-right", className)} {...props} />;
}
