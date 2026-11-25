"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { Previewable } from "@/lib/types";
import { PreviewDrawer } from "./PreviewDrawer";

interface Ctx {
  open: (item: Previewable) => void;
  close: () => void;
}

const PreviewContext = createContext<Ctx | null>(null);

export function PreviewProvider({ children }: { children: React.ReactNode }) {
  const [item, setItem] = useState<Previewable | null>(null);
  const open = useCallback((i: Previewable) => setItem(i), []);
  const close = useCallback(() => setItem(null), []);
  return (
    <PreviewContext.Provider value={{ open, close }}>
      {children}
      <PreviewDrawer item={item} onClose={close} />
    </PreviewContext.Provider>
  );
}

export function usePreview(): Ctx {
  const ctx = useContext(PreviewContext);
  if (!ctx) throw new Error("usePreview debe usarse dentro de PreviewProvider");
  return ctx;
}

/** Botón genérico que abre el previsualizador desde componentes de servidor. */
export function OpenPreview({
  item,
  className,
  children,
  ariaLabel,
}: {
  item: Previewable;
  className?: string;
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  const { open } = usePreview();
  return (
    <button type="button" onClick={() => open(item)} className={className} aria-label={ariaLabel}>
      {children}
    </button>
  );
}
