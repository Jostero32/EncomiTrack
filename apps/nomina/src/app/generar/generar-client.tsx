"use client";

import { useState, useTransition } from "react";
import { Calculator, CheckCircle2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Card, CardContent, PageHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { useConfirm } from "@/components/ui/confirm";
import { EmptyState } from "@/components/ui/empty-state";
import { BotonesDescarga, RolConsolidado } from "@/components/rol-views";
import { SECCIONES } from "@/lib/navegacion";
import { nombrePeriodo } from "@/lib/periodo";
import type { CalculoPeriodo } from "@/lib/payroll/service";
import type { Regimen } from "@/lib/repo";
import { calcularAction, guardarAction } from "./actions";

export function GenerarClient({
  regimenes,
  periodoInicial,
  periodoMax,
}: {
  regimenes: Regimen[];
  periodoInicial: string;
  periodoMax: string;
}) {
  const [periodo, setPeriodo] = useState(periodoInicial);
  const [regimenId, setRegimenId] = useState(0);
  const [calculo, setCalculo] = useState<CalculoPeriodo | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const confirmar = useConfirm();

  function calcular() {
    setError(null);
    setGuardado(false);
    startTransition(async () => {
      const r = await calcularAction(periodo, regimenId);
      if (r.ok) setCalculo(r.calculo);
      else {
        setCalculo(null);
        setError(r.error);
      }
    });
  }

  async function guardar() {
    if (!calculo) return;
    if (
      calculo.advertencias.length &&
      !(await confirmar({
        titulo: "El cálculo tiene advertencias",
        mensaje: (
          <>
            <ul className="list-disc space-y-0.5 pl-4">
              {calculo.advertencias.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
            <p>¿Continuar de todas formas?</p>
          </>
        ),
        confirmar: "Continuar",
        tono: "warning",
      }))
    )
      return;
    if (
      calculo.rolesExistentes > 0 &&
      !(await confirmar({
        titulo: `¿Regenerar los roles de ${nombrePeriodo(calculo.periodo)}?`,
        mensaje: `El periodo ya tiene ${calculo.rolesExistentes} rol(es) generado(s). Se reemplazarán por este cálculo.`,
        confirmar: "Regenerar",
        tono: "destructive",
      }))
    )
      return;
    startTransition(async () => {
      const r = await guardarAction(calculo.periodo, regimenId);
      if (r.ok) {
        setCalculo({ ...r.calculo, rolesExistentes: r.calculo.filas.length });
        setGuardado(true);
      } else setError(r.error);
    });
  }

  return (
    <>
      <PageHeader
        icon={SECCIONES.generar.icon}
        title="Generar rol de pagos"
        description="Calcule el rol del periodo con los parámetros vigentes y guárdelo."
      />

      <Card className="mb-5">
        <CardContent className="flex flex-wrap items-end gap-4">
          <Field label="Periodo" className="w-48">
            <Input
              type="month"
              value={periodo}
              max={periodoMax}
              onChange={(e) => {
                setPeriodo(e.target.value);
                setCalculo(null);
              }}
            />
          </Field>
          <Field label="Régimen" className="w-64">
            <Select
              value={regimenId}
              onChange={(e) => {
                setRegimenId(Number(e.target.value));
                setCalculo(null);
              }}
            >
              <option value={0}>Todos los regímenes</option>
              {regimenes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Button onClick={calcular} disabled={pending || !periodo}>
            <Calculator /> {pending && !calculo ? "Calculando…" : "Calcular"}
          </Button>
          {calculo && calculo.filas.length > 0 && (
            <Button onClick={guardar} disabled={pending} variant={guardado ? "outline" : "default"}>
              <Save /> {calculo.rolesExistentes > 0 ? "Regenerar y guardar" : "Generar y guardar"}
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="mb-5 space-y-3">
        {error && <Alert tone="danger">{error}</Alert>}
        {calculo && calculo.errores.length > 0 && (
          <Alert tone="danger" title="No se pudo calcular a todos los empleados">
            {calculo.errores.map((e) => (
              <p key={e}>{e}</p>
            ))}
          </Alert>
        )}
        {calculo && calculo.advertencias.length > 0 && (
          <Alert tone="warning" title="Advertencias">
            {calculo.advertencias.map((a) => (
              <p key={a}>{a}</p>
            ))}
          </Alert>
        )}
        {calculo && !guardado && calculo.rolesExistentes > 0 && (
          <Alert tone="info">
            Este periodo ya tiene {calculo.rolesExistentes} rol(es) guardado(s). Lo que ve es un cálculo nuevo con los parámetros
            vigentes; al guardar se reemplazarán.
          </Alert>
        )}
        {guardado && (
          <Alert tone="success">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="size-4" /> Rol de {nombrePeriodo(calculo!.periodo)} guardado. Ya puede imprimir o exportar.
            </span>
          </Alert>
        )}
      </div>

      {calculo && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Rol consolidado · {nombrePeriodo(calculo.periodo)}</p>
              <p className="text-xs text-muted-foreground">
                {guardado ? "Guardado" : "Vista previa (sin guardar)"} · {calculo.filas.length} empleados
              </p>
            </div>
            {guardado && (
              <div className="flex gap-2">
                <BotonesDescarga periodo={calculo.periodo} />
              </div>
            )}
          </div>
          {calculo.filas.length ? (
            <RolConsolidado filas={calculo.filas} guardado={guardado} />
          ) : (
            <EmptyState>No hay empleados activos para este periodo.</EmptyState>
          )}
        </Card>
      )}
    </>
  );
}
