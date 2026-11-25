"use client";

import { useState, useTransition } from "react";
import { Eye, HardDrive, KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { loginAdmin, logoutAdmin } from "@/app/actions";
import type { DataMode } from "@/lib/types";
import { Modal } from "./Modal";

export function AdminControl({ crudEnabled, isAdmin }: { crudEnabled: boolean; isAdmin: boolean; mode: DataMode }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const modeBadge = (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-white/45">
      {crudEnabled ? <HardDrive className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
      {crudEnabled ? "Archivos en volumen Docker" : "Solo lectura"}
    </span>
  );

  if (!crudEnabled) return modeBadge;

  return (
    <div className="space-y-2.5">
      {modeBadge}
      {isAdmin ? (
        <div className="flex items-center justify-between rounded-lg bg-emerald-400/10 px-3 py-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" /> Gestión activa
          </span>
          <button
            onClick={() => start(() => logoutAdmin())}
            className="inline-flex items-center gap-1 text-[11px] text-white/60 hover:text-white"
          >
            <LogOut className="h-3 w-3" /> Salir
          </button>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-white/80 transition hover:border-white/30 hover:bg-white/5 hover:text-white"
        >
          <KeyRound className="h-3.5 w-3.5" /> Gestionar documentos
        </button>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Gestión de documentos" description="Ingresa la clave de administración para agregar o eliminar documentos." size="sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            start(async () => {
              const res = await loginAdmin(code);
              if (res.ok) {
                setOpen(false);
                setCode("");
              } else setError(res.error ?? "Error");
            });
          }}
          className="space-y-4"
        >
          <input
            type="password"
            autoFocus
            className="field"
            placeholder="Clave de administración"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="btn-primary w-full" disabled={pending || !code}>
            {pending ? "Verificando…" : "Ingresar"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
