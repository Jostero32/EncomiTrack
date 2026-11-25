"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { History, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Badge, Card, PageHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfiguracionNav } from "@/components/configuracion-nav";
import { formatUSD, parseMoneyToCents } from "@/lib/money";
import { SECCIONES } from "@/lib/navegacion";
import { GRUPOS_PARAMETRO, metaParametro } from "@/lib/parametros-meta";
import { fechaCorta, nombrePeriodo } from "@/lib/periodo";
import type { Parametro, Regimen } from "@/lib/repo";
import { editarParametro } from "./actions";

export function mostrarValor(p: Pick<Parametro, "tipo" | "valor" | "clave">) {
  if (p.tipo === "porcentaje") return `${p.valor} %`;
  if (p.tipo === "moneda") {
    try {
      return formatUSD(parseMoneyToCents(p.valor));
    } catch {
      return p.valor;
    }
  }
  if (p.tipo === "numero") {
    const unidad = metaParametro(p.clave).unidad;
    return `${p.valor.replace(/\.00$/, "")}${unidad ? ` ${unidad}` : ""}`;
  }
  return p.valor;
}

const unidadEntrada = (p: Parametro) =>
  p.tipo === "porcentaje" ? " (%)" : p.tipo === "moneda" ? " (USD)" : metaParametro(p.clave).unidad ? ` (${metaParametro(p.clave).unidad})` : "";

/** Los parámetros LOEP se crearon copiando CT; la descripción lo indica. */
const esReferenciaInicial = (p: Parametro) => p.descripcion.includes("referencia inicial");

function TablaParametros({
  actuales,
  todos,
  onEditar,
  onHistorial,
}: {
  actuales: Parametro[];
  todos: Parametro[];
  onEditar: (p: Parametro) => void;
  onHistorial: (p: Parametro) => void;
}) {
  const grupos = GRUPOS_PARAMETRO.map((grupo) => ({
    grupo,
    filas: actuales.filter((p) => metaParametro(p.clave).grupo === grupo),
  })).filter((g) => g.filas.length > 0);

  return (
    <Table>
      <THead>
        <TR>
          <TH>Parámetro</TH>
          <TH numeric>Valor vigente</TH>
          <TH>Vigente desde</TH>
          <TH>Versiones</TH>
          <TH className="text-right">Acciones</TH>
        </TR>
      </THead>
      <TBody className="[&>tr:nth-child(even)]:bg-transparent">
        {grupos.map(({ grupo, filas }) => (
          <Fragment key={grupo}>
            <TR className="bg-muted/70">
              <TD colSpan={5} className="py-2 text-xs font-semibold uppercase tracking-wide text-primary">
                {grupo}
              </TD>
            </TR>
            {filas.map((p) => {
              const meta = metaParametro(p.clave);
              const cambios = todos.filter((t) => t.clave === p.clave && t.regimenId === p.regimenId).length;
              return (
                <TR key={p.id}>
                  <TD>
                    <p className="flex flex-wrap items-center gap-2 font-medium" title={`Clave interna: ${p.clave}`}>
                      {meta.nombre}
                      {esReferenciaInicial(p) && <Badge tone="warning">Verificar</Badge>}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{meta.ayuda ?? p.descripcion}</p>
                  </TD>
                  <TD numeric className="text-base font-semibold">
                    {mostrarValor(p)}
                  </TD>
                  <TD className="tabular whitespace-nowrap">{fechaCorta(p.vigenteDesde)}</TD>
                  <TD>{cambios > 1 ? <Badge tone="primary">{cambios} versiones</Badge> : <Badge>1 versión</Badge>}</TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Editar" onClick={() => onEditar(p)}>
                        <Pencil />
                      </Button>
                      <Button variant="ghost" size="icon" title="Historial" onClick={() => onHistorial(p)}>
                        <History />
                      </Button>
                    </div>
                  </TD>
                </TR>
              );
            })}
          </Fragment>
        ))}
      </TBody>
    </Table>
  );
}

export function ParametrosClient({
  parametros,
  regimenes,
  periodoDefault,
}: {
  parametros: Parametro[];
  regimenes: Regimen[];
  periodoDefault: string;
}) {
  const [editando, setEditando] = useState<Parametro | null>(null);
  const [historial, setHistorial] = useState<Parametro | null>(null);
  const [valor, setValor] = useState("");
  const [desde, setDesde] = useState(periodoDefault);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const actuales = useMemo(() => parametros.filter((p) => p.vigenteHasta === null), [parametros]);
  const ambitos = [
    { key: "global", label: "General", regimenId: null as number | null },
    ...regimenes.map((r) => ({ key: r.codigo, label: r.nombre, regimenId: r.id as number | null })),
  ];
  const nombreAmbito = (regimenId: number | null) =>
    ambitos.find((a) => a.regimenId === regimenId)?.label ?? "General";

  function abrirEdicion(p: Parametro) {
    setError(null);
    setValor(p.tipo === "numero" ? p.valor.replace(/\.00$/, "") : p.valor);
    setDesde(periodoDefault < p.vigenteDesde.slice(0, 7) ? p.vigenteDesde.slice(0, 7) : periodoDefault);
    setEditando(p);
  }

  function guardar(ev: React.FormEvent) {
    ev.preventDefault();
    if (!editando) return;
    startTransition(async () => {
      const r = await editarParametro(editando.id, valor, desde);
      if (r.ok) setEditando(null);
      else setError(r.error);
    });
  }

  const versiones = historial
    ? parametros.filter((p) => p.clave === historial.clave && p.regimenId === historial.regimenId)
    : [];

  return (
    <>
      <PageHeader
        eyebrow="Configuración"
        icon={SECCIONES.configuracion.icon}
        title="Cálculo de nómina"
        description="Valores legales por régimen. Cada cambio crea una nueva versión con vigencia; los periodos anteriores conservan su valor."
      />
      <ConfiguracionNav />
      <Alert tone="info">
        Los valores cargados son de referencia. Verifíquelos con la normativa vigente (Ministerio del Trabajo, IESS) antes de
        generar roles reales.
      </Alert>

      <Tabs defaultValue="global" className="mt-5">
        <TabsList>
          {ambitos.map((a) => (
            <TabsTrigger key={a.key} value={a.key}>
              {a.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {ambitos.map((a) => (
          <TabsContent key={a.key} value={a.key} className="mt-4">
            <Card>
              <TablaParametros
                actuales={actuales.filter((p) => p.regimenId === a.regimenId)}
                todos={parametros}
                onEditar={abrirEdicion}
                onHistorial={setHistorial}
              />
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        {editando && (
          <DialogContent
            title={`Editar ${metaParametro(editando.clave).nombre.toLowerCase()}`}
            description={`${nombreAmbito(editando.regimenId)} · ${metaParametro(editando.clave).ayuda ?? editando.descripcion}`}
          >
            <form onSubmit={guardar} className="space-y-4">
              <div className="rounded-md bg-muted/60 px-3 py-2 text-sm">
                Valor actual: <span className="font-semibold">{mostrarValor(editando)}</span> (desde {fechaCorta(editando.vigenteDesde)})
              </div>
              <Field label={`Nuevo valor${unidadEntrada(editando)}`}>
                <Input value={valor} onChange={(e) => setValor(e.target.value)} required autoFocus />
              </Field>
              <Field
                label="Vigente desde el periodo"
                hint={`${desde ? nombrePeriodo(desde) : ""}. Si coincide con la vigencia actual se corrige el valor; si es posterior, se cierra la versión actual y se crea una nueva.`}
              >
                <Input type="month" value={desde} min={editando.vigenteDesde.slice(0, 7)} onChange={(e) => setDesde(e.target.value)} required />
              </Field>
              {error && <Alert tone="danger">{error}</Alert>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditando(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Guardando…" : "Guardar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={!!historial} onOpenChange={(o) => !o && setHistorial(null)}>
        {historial && (
          <DialogContent
            title={`Historial · ${metaParametro(historial.clave).nombre}`}
            description={nombreAmbito(historial.regimenId)}
          >
            <Table>
              <THead>
                <TR>
                  <TH numeric>Valor</TH>
                  <TH>Desde</TH>
                  <TH>Hasta</TH>
                </TR>
              </THead>
              <TBody>
                {versiones.map((v) => (
                  <TR key={v.id}>
                    <TD numeric className="font-medium">
                      {mostrarValor(v)}
                    </TD>
                    <TD className="tabular">{fechaCorta(v.vigenteDesde)}</TD>
                    <TD className="tabular">{v.vigenteHasta ? fechaCorta(v.vigenteHasta) : <Badge tone="success">Vigente</Badge>}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
