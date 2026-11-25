"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/form";
import { centsToInput, formatUSD } from "@/lib/money";
import { leerDescuentosForm, totalDescuentos, type DescuentoForm } from "@/lib/payroll/descuentos";

export function DescuentosDialog({ nombre, periodo, iniciales, onClose, onApply }: {
  nombre: string;
  periodo: string;
  iniciales: DescuentoForm[];
  onClose: () => void;
  onApply: (detalle: DescuentoForm[], total: string) => void;
}) {
  const [items, setItems] = useState<DescuentoForm[]>(() => iniciales.map(d => ({ ...d })));
  const [error, setError] = useState("");
  let total: number | null = null;
  try { total = totalDescuentos(leerDescuentosForm(items)); } catch { /* El formulario puede estar incompleto. */ }

  const cambiar = (i: number, campo: keyof DescuentoForm, valor: string) => {
    setError("");
    setItems(ds => ds.map((d, j) => i === j ? { ...d, [campo]: valor } : d));
  };

  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent title="Descuentos por concepto" description={`${nombre} · ${periodo}`} className="max-w-xl">
      <form onSubmit={e => {
        e.preventDefault();
        try {
          const detalle = leerDescuentosForm(items);
          onApply(detalle.map(d => ({ concepto: d.concepto, importe: centsToInput(d.valorCent) })), centsToInput(totalDescuentos(detalle)));
        } catch (e) { setError((e as Error).message); }
      }}>
        <p className="mb-4 text-sm text-muted-foreground">Registre cada descuento manual de este mes. El IESS y la retención de impuesto a la renta se muestran por separado en el rol.</p>
        <div className="space-y-3">
          {items.length === 0 && <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Sin descuentos manuales en este periodo.</div>}
          {items.map((d, i) => <div key={i} className="flex items-end gap-2 rounded-md border bg-muted/20 p-3">
            <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-[1fr_8rem]">
              <div className="space-y-1">
                <Label htmlFor={`descuento-concepto-${i}`}>Concepto</Label>
                <Input id={`descuento-concepto-${i}`} aria-label={`Concepto ${i + 1}`} list="conceptos-descuentos" placeholder="Ej. Anticipo de sueldo" maxLength={120} value={d.concepto} onChange={e => cambiar(i, "concepto", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`descuento-importe-${i}`}>Importe (USD)</Label>
                <Input id={`descuento-importe-${i}`} aria-label={`Importe ${i + 1}`} inputMode="decimal" placeholder="0.00" className="text-right tabular" value={d.importe} onChange={e => cambiar(i, "importe", e.target.value)} onFocus={e => e.target.select()} />
              </div>
            </div>
            <Button type="button" variant="ghost" size="icon" aria-label={`Eliminar descuento ${i + 1}`} onClick={() => { setItems(ds => ds.filter((_, j) => i !== j)); setError(""); }}><Trash2 className="size-4" /></Button>
          </div>)}
        </div>
        <datalist id="conceptos-descuentos"><option value="Anticipo de sueldo" /><option value="Cuota de préstamo" /><option value="Otro descuento" /></datalist>
        <Button type="button" variant="outline" className="mt-3" disabled={items.length >= 50} onClick={() => { setItems(ds => [...ds, { concepto: "", importe: "" }]); setError(""); }}><Plus /> Agregar descuento</Button>
        <div className="my-4 flex items-center justify-between gap-3 rounded-md bg-primary/5 p-3 font-semibold"><span>Total descuentos manuales</span><span className="tabular shrink-0 whitespace-nowrap">{total === null ? "—" : formatUSD(total)}</span></div>
        {error && <div role="alert"><Alert tone="danger">{error}</Alert></div>}
        <p className="my-4 text-xs text-muted-foreground">Aplique el detalle y luego pulse «Guardar novedades» para registrarlo. Use hasta dos decimales por importe.</p>
        <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit">Aplicar descuentos</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}
