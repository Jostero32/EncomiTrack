import { AlertTriangle, Loader2 } from "lucide-react";

export function ViewerLoading({ label = "Cargando documento…" }: { label?: string }) {
  return (
    <div className="flex h-full min-h-[320px] items-center justify-center gap-2 text-sm text-ink-500">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}

export function ViewerError({ message, href }: { message: string; href?: string | null }) {
  return (
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 px-6 text-center">
      <AlertTriangle className="h-5 w-5 text-amber-500" />
      <p className="max-w-sm text-sm text-ink-700">{message}</p>
      {href && (
        <a href={href} target="_blank" rel="noreferrer" className="btn-outline">
          Abrir en pestaña nueva
        </a>
      )}
    </div>
  );
}
