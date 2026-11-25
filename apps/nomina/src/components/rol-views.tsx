"use client";

import { useState } from "react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { COLUMNAS_NOMINA, COLUMNAS_OBLIGACIONES, type ColumnaNomina } from "@/lib/payroll/columnas";
import { FileDown, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RegimenBadge } from "@/components/regimen-badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Table, TBody, TD, TFoot, TH, THead, TR } from "@/components/ui/table";
import { conBase } from "@/lib/base-path";
import { formatUSD } from "@/lib/money";
import { nombrePeriodo } from "@/lib/periodo";
import type { FilaRol } from "@/lib/payroll/service";
import type { Concepto } from "@/lib/payroll/engine";
import { descuentosDelRol } from "@/lib/payroll/descuentos";

function suma(filas: FilaRol[], f: (x: FilaRol) => number) {
  return filas.reduce((a, x) => a + f(x), 0);
}

const v = (fila: FilaRol, codigo: string) =>
  [...fila.resultado.ingresos, ...fila.resultado.egresos].find((c) => c.codigo === codigo)?.valorCent ?? 0;

export function RolConsolidado({ filas, guardado }: { filas: FilaRol[]; guardado: boolean }) {
  const [sel, setSel] = useState<FilaRol | null>(null);
  const descuentos = filas.flatMap(f => descuentosDelRol(f.resultado).map(d => ({ ...d, fila: f })));
  function tabla(columnas: ColumnaNomina[]) {
    const grupos = [...new Set(columnas.map(c => c.grupo))];
    return <Table>
      <THead>
        <TR><TH rowSpan={2} className="sticky left-0 z-10 bg-muted">Empleado</TH><TH rowSpan={2}>Rég.</TH>
          {grupos.map(g => <TH key={g} colSpan={columnas.filter(c => c.grupo === g).length} className="border-l text-center text-primary">{g}</TH>)}
          {guardado && <TH rowSpan={2}>Rol</TH>}
        </TR>
        <TR>{columnas.map(c => <TH numeric key={c.clave}>{c.nombre}</TH>)}</TR>
      </THead>
      <TBody>{filas.map(f => <TR key={f.empleado.id} className="cursor-pointer hover:bg-primary-soft/60" onClick={() => setSel(f)}>
        <TD className="sticky left-0 z-10 min-w-52 bg-card"><p className="font-medium">{f.empleado.apellidos} {f.empleado.nombres}</p><p className="text-xs text-muted-foreground">{f.empleado.cargo}</p></TD>
        <TD><RegimenBadge codigo={f.empleado.regimenCodigo} /></TD>
        {columnas.map(c => <TD numeric key={c.clave} className={c.clave === "neto" ? "bg-primary-soft font-semibold text-primary" : c.clave === "patronal" ? "font-semibold text-primary" : ""}>
          {(c.clave === "saldo13" || c.clave === "saldo14") && !f.resultado.beneficios ? "—" : formatUSD(c.valor(f))}
          {c.clave === "decimo13" && <p className="text-[10px] text-muted-foreground">{f.empleado.mensualiza13 ? "Mensualizado" : "Acumulado"}</p>}
          {c.clave === "decimo14" && <p className="text-[10px] text-muted-foreground">{f.empleado.mensualiza14 ? "Mensualizado" : "Acumulado"}</p>}
          {c.clave === "fondos" && <p className="text-[10px] text-muted-foreground">{f.empleado.fondosReservaModalidad === "IESS" ? "Depósito IESS" : "Pago directo"}</p>}
          {(c.clave === "personal" || c.clave === "patronal") && <p className="text-[10px] text-muted-foreground">{c.clave === "personal" ? f.resultado.parametros.iess_aporte_personal : f.resultado.parametros.iess_aporte_patronal}%</p>}
        </TD>)}
        {guardado && <TD onClick={e => e.stopPropagation()}><Button asChild variant="ghost" size="icon" title="Imprimir rol"><a href={conBase(`/api/roles/${f.resultado.periodo}/empleado/${f.empleado.id}/pdf`)} target="_blank" rel="noreferrer"><Printer /></a></Button></TD>}
      </TR>)}</TBody>
      <TFoot><TR><TD colSpan={2} className="sticky left-0 bg-muted">Totales ({filas.length})</TD>{columnas.map(c => <TD numeric key={c.clave} className={c.clave === "neto" ? "text-primary" : ""}>
        {(c.clave === "saldo13" || c.clave === "saldo14") && filas.some(f => !f.resultado.beneficios) ? "—" : formatUSD(suma(filas, c.valor))}
      </TD>)}{guardado && <TD />}</TR></TFoot>
    </Table>;
  }
  return <>
    <Tabs defaultValue="nomina">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <TabsList className="h-auto max-w-full flex-wrap"><TabsTrigger value="nomina">Nómina detallada</TabsTrigger><TabsTrigger value="obligaciones">IESS y beneficios</TabsTrigger><TabsTrigger value="descuentos">Descuentos</TabsTrigger></TabsList>
        <Link href="/parametros/guia-nomina" className="text-xs font-medium text-primary underline">Cómo se calcula</Link>
      </div>
      <TabsContent value="nomina">{tabla(COLUMNAS_NOMINA)}</TabsContent>
      <TabsContent value="obligaciones">{tabla(COLUMNAS_OBLIGACIONES)}<p className="px-4 py-3 text-xs text-muted-foreground">El aporte del empleador y los fondos destinados al IESS no reducen el sueldo. Los saldos incluyen únicamente los periodos registrados; no acreditan un depósito o pago realizado.</p></TabsContent>
      <TabsContent value="descuentos">
        {descuentos.length ? <Table><THead><TR><TH>Empleado</TH><TH>Concepto</TH><TH numeric>Importe</TH></TR></THead>
          <TBody>{descuentos.map((d, i) => <TR key={i}><TD><p className="font-medium">{d.fila.empleado.apellidos} {d.fila.empleado.nombres}</p><p className="text-xs text-muted-foreground">{d.fila.empleado.cedula}</p></TD><TD className="min-w-48 whitespace-normal break-words">{d.concepto}</TD><TD numeric>{formatUSD(d.valorCent)}</TD></TR>)}</TBody>
          <TFoot><TR><TD colSpan={2}>Total descuentos manuales</TD><TD numeric>{formatUSD(descuentos.reduce((sum, d) => sum + d.valorCent, 0))}</TD></TR></TFoot>
        </Table> : <p className="px-4 py-8 text-center text-sm text-muted-foreground">Sin descuentos manuales en estos roles.</p>}
        <p className="px-4 py-3 text-xs text-muted-foreground">Estos importes ya están incluidos en «Otros descuentos» de la nómina. El IESS personal y la retención IR se muestran por separado.</p>
      </TabsContent>
    </Tabs>
    <p className="border-t px-4 py-2 text-xs text-muted-foreground">Desplace la tabla para consultar todos los conceptos. Abra una fila para ver fórmulas, modalidades y saldos.</p>
    <Dialog open={!!sel} onOpenChange={o => !o && setSel(null)}>{sel && <DialogContent className="max-w-4xl" title={`Rol de pagos · ${sel.empleado.apellidos} ${sel.empleado.nombres}`} description={`${nombrePeriodo(sel.resultado.periodo)} · ${sel.empleado.regimenNombre} · C.I. ${sel.empleado.cedula}`}>
      <RolDetalle fila={sel} />
      {guardado ? <div className="mt-5 flex justify-end"><Button asChild><a href={conBase(`/api/roles/${sel.resultado.periodo}/empleado/${sel.empleado.id}/pdf`)} target="_blank" rel="noreferrer"><Printer /> Imprimir rol</a></Button></div> : <p className="mt-4 text-xs text-muted-foreground">Guarde el rol para imprimirlo.</p>}
    </DialogContent>}</Dialog>
  </>;
}

function ListaConceptos({ titulo, conceptos, total }: { titulo: string; conceptos: Concepto[]; total: number }) {
  return (
    <div className="rounded-md border">
      <p className="border-b bg-muted/60 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</p>
      <table className="w-full text-sm">
        <tbody>
          {conceptos.filter(c => !c.codigo.startsWith("pago_decimo_") || c.valorCent !== 0).map((c) => (
            <tr key={c.codigo} className="border-b last:border-0">
              <td className="px-3 py-2">
                <p>{c.nombre}</p>
                {c.detalle && <p className="text-xs text-muted-foreground">{c.detalle}</p>}
              </td>
              <td className="tabular whitespace-nowrap px-3 py-2 text-right align-top">{formatUSD(c.valorCent)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t bg-muted/40 font-semibold">
            <td className="px-3 py-2">Total</td>
            <td className="tabular px-3 py-2 text-right">{formatUSD(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function RolDetalle({ fila }: { fila: FilaRol }) {
  const r = fila.resultado;
  const p = r.provisiones;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Dato label="Cargo" valor={fila.empleado.cargo || "—"} />
        <Dato label="Sueldo base" valor={formatUSD(fila.empleado.sueldoBaseCent)} />
        <Dato label="Días trabajados" valor={String(r.diasTrabajados)} />
        <Dato label="Base aportación IESS" valor={formatUSD(r.baseIessCent)} />
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <span>13.º: <strong className="text-foreground">{fila.empleado.mensualiza13 ? "Mensualizado" : "Acumulado"}</strong></span>
        <span>14.º: <strong className="text-foreground">{fila.empleado.mensualiza14 ? "Mensualizado" : "Acumulado"}</strong></span>
        <span>Fondos: <strong className="text-foreground">{fila.empleado.fondosReservaModalidad === "IESS" ? "Depósito al IESS" : "Pago directo"}</strong></span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <ListaConceptos titulo="Ingresos" conceptos={r.ingresos} total={r.totalIngresosCent} />
        <div className="space-y-4">
          <ListaConceptos titulo="Descuentos del empleado" conceptos={r.egresos} total={r.totalEgresosCent} />
          <div className="flex items-center justify-between rounded-md bg-primary px-4 py-3 text-primary-foreground">
            <span className="text-sm font-medium">Neto a recibir</span>
            <span className="tabular text-lg font-semibold">{formatUSD(r.netoCent)}</span>
          </div>
          <div className="rounded-md border p-3 text-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Beneficios generados este mes</p>
            <Linea label="Décimo tercero por acumular" valor={p.decimoTerceroCent} />
            <Linea label="Décimo cuarto por acumular" valor={p.decimoCuartoCent} />
            <Linea label="Fondos de reserva con destino IESS" valor={p.fondosReservaCent} />
          </div>
        </div>
      </div>
      <div className="overflow-hidden rounded-md border">
        <p className="border-b bg-muted/60 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Aportes al IESS · empleado y empleador</p>
        <Table><THead><TR><TH>Responsable</TH><TH numeric>Base</TH><TH numeric>Porcentaje</TH><TH numeric>Aporte</TH></TR></THead>
          <TBody><TR><TD>Empleado · descuento del rol</TD><TD numeric>{formatUSD(r.baseIessCent)}</TD><TD numeric>{r.parametros.iess_aporte_personal}%</TD><TD numeric>{formatUSD(v(fila, "aporte_iess_personal"))}</TD></TR>
            <TR><TD>Empleador · a cargo de la empresa</TD><TD numeric>{formatUSD(r.baseIessCent)}</TD><TD numeric>{r.parametros.iess_aporte_patronal}%</TD><TD numeric>{formatUSD(p.aportePatronalCent)}</TD></TR></TBody>
          <TFoot><TR><TD colSpan={3}>Total de aportes IESS</TD><TD numeric>{formatUSD(v(fila, "aporte_iess_personal") + p.aportePatronalCent)}</TD></TR></TFoot>
        </Table>
        <p className="px-3 py-2 text-xs text-muted-foreground">El aporte patronal es adicional al pago del trabajador. Los fondos de reserva se informan por separado.</p>
      </div>
      {r.beneficios ? <div className="overflow-hidden rounded-md border">
        <p className="border-b bg-muted/60 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Décimos acumulados · saldos registrados</p>
        <Table><THead><TR><TH>Beneficio</TH><TH numeric>Saldo anterior</TH><TH numeric>Devengado</TH><TH numeric>Pago en este rol</TH><TH numeric>Saldo pendiente</TH></TR></THead>
          <TBody>{([["Décimo tercero", r.beneficios.decimoTercero], ["Décimo cuarto", r.beneficios.decimoCuarto]] as const).map(([nombre, b]) => <TR key={nombre}><TD>{nombre}</TD><TD numeric>{formatUSD(b.saldoAnteriorCent)}</TD><TD numeric>{formatUSD(b.devengadoCent)}</TD><TD numeric>{formatUSD(b.pagadoCent)}</TD><TD numeric className="font-semibold">{formatUSD(b.saldoCent)}</TD></TR>)}</TBody>
        </Table><p className="px-3 py-2 text-xs text-muted-foreground">Comprende los periodos registrados desde {nombrePeriodo(r.beneficios.decimoTercero.desdePeriodo)}. El pago acumulado se registra en Novedades y se incluye una sola vez en ingresos.</p>
      </div> : <p className="text-xs text-muted-foreground">Este rol histórico conserva las provisiones del mes; no contiene un estado de saldos acumulados.</p>}
      {r.advertencias.length > 0 && (
        <div className="rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-sm text-warning">
          {r.advertencias.map((a) => (
            <p key={a}>{a}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-md bg-muted/60 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="tabular font-medium">{valor}</p>
    </div>
  );
}

function Linea({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular">{formatUSD(valor)}</span>
    </div>
  );
}

export function BotonesDescarga({ periodo }: { periodo: string }) {
  return (
    <>
      <Button asChild variant="outline">
        <a href={conBase(`/api/roles/${periodo}/excel`)}>
          <FileDown /> Excel consolidado
        </a>
      </Button>
      <Button asChild variant="outline">
        <a href={conBase(`/api/roles/${periodo}/pdf`)} target="_blank" rel="noreferrer">
          <Printer /> Descargar consolidado PDF
        </a>
      </Button>
    </>
  );
}
