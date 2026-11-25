import { Badge, type BadgeTone } from "@/components/ui/card";

const TONOS: Record<string, BadgeTone> = {
  CT: "primary",
  LOSEP: "gold",
  LOEP: "outline",
};

const NOMBRES: Record<string, string> = {
  CT: "Código de Trabajo",
  LOSEP: "LOSEP (sector público)",
  LOEP: "LOEP (empresas públicas)",
};

/** Etiqueta del régimen laboral con un color fijo por régimen. */
export function RegimenBadge({ codigo }: { codigo: string }) {
  return (
    <Badge tone={TONOS[codigo] ?? "neutral"} title={NOMBRES[codigo]}>
      {codigo}
    </Badge>
  );
}
