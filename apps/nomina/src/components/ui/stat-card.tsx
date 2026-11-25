import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TONOS = {
  primary: "bg-primary-soft text-primary",
  gold: "bg-gold-soft text-gold-foreground",
  accent: "bg-accent-soft text-accent",
  success: "bg-success-soft text-success",
} as const;

/** Indicador numérico con ícono, usado en paneles y resúmenes. */
export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "primary",
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: keyof typeof TONOS;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4">
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-md", TONOS[tone])}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="tabular mt-0.5 text-2xl font-semibold tracking-tight">{value}</p>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
