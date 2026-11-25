import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border bg-card shadow-xs", className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1 border-b px-5 py-4", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-sm font-semibold", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}

export type BadgeTone = "neutral" | "primary" | "gold" | "outline" | "success" | "warning" | "danger";

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  const tones = {
    neutral: "bg-muted text-muted-foreground",
    primary: "bg-primary-soft text-primary",
    gold: "bg-gold-soft text-gold-foreground",
    outline: "border border-primary/30 bg-card text-primary",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-destructive-soft text-destructive",
  };
  return (
    <span
      className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium", tones[tone], className)}
      {...props}
    />
  );
}

export function Alert({
  tone = "warning",
  title,
  children,
}: {
  tone?: "warning" | "danger" | "success" | "info";
  title?: string;
  children: React.ReactNode;
}) {
  const tones = {
    warning: "border-warning/30 bg-warning-soft text-warning",
    danger: "border-destructive/30 bg-destructive-soft text-destructive",
    success: "border-success/30 bg-success-soft text-success",
    info: "border-primary/20 bg-primary-soft text-primary",
  };
  return (
    <div className={cn("rounded-md border px-4 py-3 text-sm", tones[tone])}>
      {title && <p className="mb-1 font-semibold">{title}</p>}
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  icon: Icon,
  eyebrow,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  icon?: LucideIcon;
  /** Sección a la que pertenece la pantalla, p. ej. "Configuración". */
  eyebrow?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3.5">
        {Icon && (
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
            <Icon className="size-5" />
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">{eyebrow}</p>}
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
