"use client";

import * as React from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface OpcionesConfirmacion {
  titulo: string;
  mensaje?: React.ReactNode;
  confirmar?: string;
  cancelar?: string;
  /** "destructive" para desactivar o reemplazar datos; "warning" para continuar pese a advertencias. */
  tono?: "default" | "destructive" | "warning";
}

type Confirmar = (opciones: OpcionesConfirmacion) => Promise<boolean>;

const ConfirmContext = React.createContext<Confirmar | null>(null);

/** Reemplaza a window.confirm con un diálogo del sistema de diseño. */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [actual, setActual] = React.useState<(OpcionesConfirmacion & { responder: (v: boolean) => void }) | null>(null);

  const confirmar = React.useCallback<Confirmar>(
    (opciones) => new Promise((resolve) => setActual({ ...opciones, responder: resolve })),
    [],
  );

  const cerrar = (valor: boolean) => {
    actual?.responder(valor);
    setActual(null);
  };

  return (
    <ConfirmContext.Provider value={confirmar}>
      {children}
      <Dialog open={!!actual} onOpenChange={(abierto) => !abierto && cerrar(false)}>
        {actual && (
          <DialogContent title={actual.titulo} className="max-w-md">
            <div className="flex gap-3">
              {actual.tono && actual.tono !== "default" && (
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full",
                    actual.tono === "destructive" ? "bg-destructive-soft text-destructive" : "bg-warning-soft text-warning",
                  )}
                >
                  <TriangleAlert className="size-4" />
                </span>
              )}
              {actual.mensaje && <div className="space-y-2 text-sm text-muted-foreground">{actual.mensaje}</div>}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => cerrar(false)}>
                {actual.cancelar ?? "Cancelar"}
              </Button>
              <Button variant={actual.tono === "destructive" ? "destructive" : "default"} autoFocus onClick={() => cerrar(true)}>
                {actual.confirmar ?? "Continuar"}
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): Confirmar {
  const confirmar = React.useContext(ConfirmContext);
  if (!confirmar) throw new Error("useConfirm debe usarse dentro de ConfirmProvider");
  return confirmar;
}
