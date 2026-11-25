"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Card, PageHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { Table, TBody, TD, TFoot, TH, THead, TR } from "@/components/ui/table";
import { useConfirm } from "@/components/ui/confirm";
import { EmptyRow } from "@/components/ui/empty-state";
import { RegimenBadge } from "@/components/regimen-badge";
import { SECCIONES } from "@/lib/navegacion";
import { formatAmount, formatUSD, parseScaled } from "@/lib/money";
import { nombrePeriodo } from "@/lib/periodo";
import { cn } from "@/lib/utils";
import { guardarNovedadesAction, type NovedadForm } from "./actions";
import { DescuentosDialog } from "./descuentos-dialog";

export interface FilaNovedad extends NovedadForm {
  nombre: string;
  cedula: string;
  regimenId: number;
  regimenCodigo: string;
}

const DIAS_LABORABLES = 22n;

function advertenciaSuplementarias(valor: string, lim?: { mes: string; dia: string }): string | null {
  if (!lim?.mes || !lim?.dia) return null;
  try {
    const h = parseScaled(valor || "0", 2);
    if (h > parseScaled(lim.mes, 2)) return `Supera el límite mensual (${lim.mes} h)`;
    if (h > parseScaled(lim.dia, 2) * DIAS_LABORABLES) return `Supera el límite diario (${lim.dia} h/día)`;
  } catch {
    return "Valor inválido";
  }
  return null;
}

type Campo = Exclude<keyof NovedadForm, "empleadoId" | "descuentosDetalle">;

export function NovedadesClient({
  periodo,
  filasIniciales,
  limites,
}: {
  periodo: string;
  filasIniciales: FilaNovedad[];
  limites: Record<number, { mes: string; dia: string }>;
}) {
  const router = useRouter();
  const [filas, setFilas] = useState(filasIniciales);
  const [editandoDescuentos, setEditandoDescuentos] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState<{ tono: "success" | "danger"; texto: string } | null>(null);
  const [sucio, setSucio] = useState(false);
  const [pending, startTransition] = useTransition();
  const confirmar = useConfirm();

  const set = (i: number, campo: Campo, valor: string) => {
    setSucio(true);
    setMensaje(null);
    setFilas((fs) => fs.map((f, j) => (j === i ? { ...f, [campo]: valor } : f)));
  };

  const advertencias = filas
    .map((f) => ({ f, msg: advertenciaSuplementarias(f.horasSuplementarias, limites[f.regimenId]) }))
    .filter((x) => x.msg);

  const totales = useMemo(() => {
    const sumar = (campo: Campo) =>
      filas.reduce((acc, f) => {
        try {
          return acc + parseScaled(f[campo] || "0", 2);
        } catch {
          return acc;
        }
      }, 0n);
    return {
      horasNocturnas: sumar("horasNocturnas"),
      horasSuplementarias: sumar("horasSuplementarias"),
      horasExtraordinarias: sumar("horasExtraordinarias"),
      otrosIngresos: sumar("otrosIngresos"),
      descuentos: sumar("descuentos"),
      impuestoRenta: sumar("impuestoRenta"),
      pagoDecimoTercero: sumar("pagoDecimoTercero"),
      pagoDecimoCuarto: sumar("pagoDecimoCuarto"),
    };
  }, [filas]);

  async function guardar() {
    if (
      advertencias.length &&
      !(await confirmar({
        titulo: "Horas suplementarias sobre el límite",
        mensaje: (
          <>
            <ul className="list-disc space-y-0.5 pl-4">
              {advertencias.map((a) => (
                <li key={a.f.empleadoId}>
                  {a.f.nombre}: {a.msg}
                </li>
              ))}
            </ul>
            <p>¿Desea guardar de todas formas?</p>
          </>
        ),
        confirmar: "Guardar igual",
        tono: "warning",
      }))
    )
      return;
    startTransition(async () => {
      const r = await guardarNovedadesAction(
        periodo,
        filas.map(({ empleadoId, horasNocturnas, horasSuplementarias, horasExtraordinarias, otrosIngresos, descuentos, descuentosDetalle, observacion, impuestoRenta, pagoDecimoTercero, pagoDecimoCuarto }) => ({
          empleadoId,
          horasNocturnas,
          horasSuplementarias,
          horasExtraordinarias,
          otrosIngresos,
          descuentos,
          descuentosDetalle,
          observacion,
          impuestoRenta, pagoDecimoTercero, pagoDecimoCuarto,
        })),
      );
      if (r.ok) {
        setSucio(false);
        setMensaje({ tono: "success", texto: "Novedades guardadas correctamente." });
        router.refresh();
      } else setMensaje({ tono: "danger", texto: r.error });
    });
  }

  const celda = (i: number, campo: Campo, opts: { money?: boolean; warn?: boolean } = {}) => (
    <Input
      value={filas[i][campo]}
      inputMode="decimal"
      onChange={(e) => set(i, campo, e.target.value)}
      onFocus={(e) => e.target.select()}
      className={cn("h-8 tabular text-right", opts.money ? "w-28" : "w-20", opts.warn && "border-warning bg-warning-soft")}
    />
  );

  return (
    <>
      <PageHeader
        icon={SECCIONES.novedades.icon}
        title="Novedades"
        description={`Horas extras, otros ingresos y descuentos de ${nombrePeriodo(periodo)}.`}
        actions={
          <>
            <Input
              type="month"
              value={periodo}
              className="w-44"
              onChange={async (e) => {
                const destino = e.target.value;
                if (!destino) return;
                if (
                  sucio &&
                  !(await confirmar({
                    titulo: "¿Cambiar de periodo?",
                    mensaje: "Hay cambios sin guardar en este periodo y se perderán.",
                    confirmar: "Cambiar sin guardar",
                    tono: "warning",
                  }))
                )
                  return;
                router.push(`/novedades?periodo=${destino}`);
              }}
            />
            <Button onClick={guardar} disabled={pending}>
              <Save /> {pending ? "Guardando…" : "Guardar novedades"}
            </Button>
          </>
        }
      />

      <div className="mb-4 space-y-3">
        {mensaje && <Alert tone={mensaje.tono}>{mensaje.texto}</Alert>}
        {advertencias.length > 0 && (
          <Alert tone="warning" title="Horas suplementarias sobre el límite">
            {advertencias.map((a) => (
              <p key={a.f.empleadoId}>
                {a.f.nombre}: {a.msg}
              </p>
            ))}
          </Alert>
        )}
      </div>

      <Card>
        <Table>
          <THead>
            <TR className="border-b-0">
              <TH colSpan={2} />
              <TH colSpan={3} className="border-l text-center normal-case tracking-normal text-[11px] text-muted-foreground/80">
                Horas
              </TH>
              <TH colSpan={3} className="border-l text-center normal-case tracking-normal text-[11px] text-muted-foreground/80">
                Montos (USD)
              </TH>
              <TH colSpan={2} className="border-l text-center normal-case tracking-normal text-[11px] text-muted-foreground/80">Pagos de décimos acumulados (USD)</TH>
              <TH />
            </TR>
            <TR>
              <TH>Empleado</TH>
              <TH>Rég.</TH>
              <TH numeric className="border-l">Nocturnas</TH>
              <TH numeric>Suplementarias</TH>
              <TH numeric>Extraordinarias</TH>
              <TH numeric className="border-l">Otros ingresos</TH>
              <TH numeric>Otros descuentos</TH>
              <TH numeric>Retención IR</TH>
              <TH numeric className="border-l">Décimo tercero</TH>
              <TH numeric>Décimo cuarto</TH>
              <TH>Observación</TH>
            </TR>
          </THead>
          <TBody>
            {filas.map((f, i) => {
              const warn = !!advertenciaSuplementarias(f.horasSuplementarias, limites[f.regimenId]);
              return (
                <TR key={f.empleadoId}>
                  <TD>
                    <p className="font-medium">{f.nombre}</p>
                    <p className="text-xs text-muted-foreground tabular">{f.cedula}</p>
                  </TD>
                  <TD>
                    <RegimenBadge codigo={f.regimenCodigo} />
                  </TD>
                  <TD numeric className="border-l">{celda(i, "horasNocturnas")}</TD>
                  <TD numeric>
                    <div className="flex items-center justify-end gap-1">
                      <TriangleAlert className={cn("size-4 shrink-0 text-warning", !warn && "invisible")} />
                      {celda(i, "horasSuplementarias", { warn })}
                    </div>
                  </TD>
                  <TD numeric>{celda(i, "horasExtraordinarias")}</TD>
                  <TD numeric className="border-l">{celda(i, "otrosIngresos", { money: true })}</TD>
                  <TD numeric>
                    <div className="min-w-28 space-y-1">
                      <p className="tabular font-medium">{formatUSD(parseScaled(f.descuentos, 2))}</p>
                      <button type="button" disabled={pending} className="text-xs font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50" aria-label={`Detallar descuentos de ${f.nombre}`} onClick={() => setEditandoDescuentos(i)}>Detallar ({f.descuentosDetalle.length})</button>
                    </div>
                  </TD>
                  <TD numeric>{celda(i, "impuestoRenta", { money: true })}</TD>
                  <TD numeric className="border-l">{celda(i, "pagoDecimoTercero", { money: true })}</TD>
                  <TD numeric>{celda(i, "pagoDecimoCuarto", { money: true })}</TD>
                  <TD>
                    <Input value={f.observacion} className="h-8 min-w-40" onChange={(e) => set(i, "observacion", e.target.value)} />
                  </TD>
                </TR>
              );
            })}
            {filas.length === 0 && <EmptyRow colSpan={11}>No hay empleados activos.</EmptyRow>}
          </TBody>
          {filas.length > 0 && (
            <TFoot>
              <TR>
                <TD colSpan={2}>Totales</TD>
                <TD numeric className="border-l">{formatAmount(totales.horasNocturnas)}</TD>
                <TD numeric>{formatAmount(totales.horasSuplementarias)}</TD>
                <TD numeric>{formatAmount(totales.horasExtraordinarias)}</TD>
                <TD numeric className="border-l">{formatUSD(totales.otrosIngresos)}</TD>
                <TD numeric>{formatUSD(totales.descuentos)}</TD>
                <TD numeric>{formatUSD(totales.impuestoRenta)}</TD>
                <TD numeric className="border-l">{formatUSD(totales.pagoDecimoTercero)}</TD>
                <TD numeric>{formatUSD(totales.pagoDecimoCuarto)}</TD>
                <TD />
              </TR>
            </TFoot>
          )}
        </Table>
      </Card>
      <p className="mt-3 text-xs text-muted-foreground">
        Horas en decimales (ej. 2.5). Importes en USD. Registre la retención IR validada con su proyección fiscal; no se calcula automáticamente.
        Los pagos acumulados se validan contra los saldos de roles guardados. Use «Detallar» para registrar los descuentos por concepto; su total se calcula automáticamente.
      </p>
      {editandoDescuentos !== null && <DescuentosDialog
        nombre={filas[editandoDescuentos].nombre}
        periodo={nombrePeriodo(periodo)}
        iniciales={filas[editandoDescuentos].descuentosDetalle}
        onClose={() => setEditandoDescuentos(null)}
        onApply={(descuentosDetalle, descuentos) => {
          setFilas(fs => fs.map((f, i) => i === editandoDescuentos ? { ...f, descuentosDetalle, descuentos } : f));
          setSucio(true);
          setMensaje(null);
          setEditandoDescuentos(null);
        }}
      />}
    </>
  );
}
