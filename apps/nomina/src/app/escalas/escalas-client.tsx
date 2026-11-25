"use client";

import { useMemo, useState, useTransition } from "react";
import { ExternalLink, ListChecks, Pencil, Plus, Scale, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Badge, Card, CardHeader, CardTitle, PageHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ConfiguracionNav } from "@/components/configuracion-nav";
import { EmptyRow } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { SearchInput, Toolbar } from "@/components/ui/toolbar";
import { RegimenBadge } from "@/components/regimen-badge";
import { SECCIONES } from "@/lib/navegacion";
import { fechaCorta } from "@/lib/periodo";
import { ESTRUCTURAS_OCUPACIONALES } from "@/lib/estructura-ocupacional";
import { centsToInput, formatUSD } from "@/lib/money";
import type {
  DetalleEscalaSalarial,
  EscalaSalarial,
  IncumplimientoSalarial,
  Regimen,
} from "@/lib/repo";
import {
  guardarDetalle,
  guardarEscala,
  type DetalleEscalaForm,
  type EscalaForm,
} from "./actions";

const ESTADOS = {
  BORRADOR: "Borrador",
  TRANSITORIA: "Transitoria",
  OFICIAL: "Oficial",
  REFERENCIAL: "Referencial",
} as const;

const REGLAS = {
  MINIMO: "Mínimo",
  FIJO: "RMU fija",
  TECHO: "Techo",
  REFERENCIA: "Referencia",
} as const;

const toneEstado = (estado: EscalaSalarial["estado"]) =>
  estado === "OFICIAL" ? "success" : estado === "TRANSITORIA" ? "warning" : estado === "REFERENCIAL" ? "primary" : "neutral";

export function EscalasClient({
  escalas,
  detalles,
  regimenes,
  incumplimientos,
  hoy,
}: {
  escalas: EscalaSalarial[];
  detalles: DetalleEscalaSalarial[];
  regimenes: Regimen[];
  incumplimientos: IncumplimientoSalarial[];
  hoy: string;
}) {
  const anioActual = Number(hoy.slice(0, 4));
  const [regimenFiltro, setRegimenFiltro] = useState<number>(0);
  const [busqueda, setBusqueda] = useState("");
  const [comisionFiltro, setComisionFiltro] = useState("");
  const [ramaFiltro, setRamaFiltro] = useState("");
  const [escalaForm, setEscalaForm] = useState<EscalaForm | null>(null);
  const [detalleForm, setDetalleForm] = useState<DetalleEscalaForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const comisiones = useMemo(
    () => Array.from(new Set(detalles.map((detalle) => detalle.comision).filter(Boolean))).sort(),
    [detalles],
  );
  const ramas = useMemo(
    () =>
      Array.from(
        new Set(
          detalles
            .filter((detalle) => !comisionFiltro || detalle.comision === comisionFiltro)
            .map((detalle) => detalle.rama)
            .filter(Boolean),
        ),
      ).sort(),
    [comisionFiltro, detalles],
  );
  const coincideDetalle = (detalle: DetalleEscalaSalarial) => {
    const consulta = busqueda.trim().toLowerCase();
    return (
      (!consulta || `${detalle.codigoReferencia} ${detalle.denominacion} ${detalle.comision} ${detalle.rama}`.toLowerCase().includes(consulta)) &&
      (!comisionFiltro || detalle.comision === comisionFiltro) &&
      (!ramaFiltro || detalle.rama === ramaFiltro)
    );
  };
  const hayFiltroCatalogo = !!(busqueda.trim() || comisionFiltro || ramaFiltro);
  const visibles = useMemo(
    () =>
      escalas.filter(
        (escala) =>
          (!regimenFiltro || escala.regimenId === regimenFiltro) &&
          (!hayFiltroCatalogo || detalles.some((detalle) => detalle.escalaId === escala.id && coincideDetalle(detalle))),
      ),
    // coincideDetalle depende de estos valores escalares y se mantiene aquí
    // explícito para que los filtros recalculen la lista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [escalas, detalles, regimenFiltro, busqueda, comisionFiltro, ramaFiltro, hayFiltroCatalogo],
  );

  function nuevaEscala() {
    setError(null);
    setEscalaForm({
      regimenId: regimenes[0]?.id ?? 1,
      nombre: `Escala salarial ${anioActual + 1}`,
      anio: anioActual + 1,
      vigenteDesde: `${anioActual + 1}-01-01`,
      vigenteHasta: "",
      estado: "BORRADOR",
      referenciaLegal: "",
      fuenteUrl: "",
      observacion: "",
    });
  }

  function editarEscala(escala: EscalaSalarial) {
    setError(null);
    setEscalaForm({
      id: escala.id,
      regimenId: escala.regimenId,
      nombre: escala.nombre,
      anio: escala.anio,
      vigenteDesde: escala.vigenteDesde,
      vigenteHasta: escala.vigenteHasta ?? "",
      estado: escala.estado,
      referenciaLegal: escala.referenciaLegal,
      fuenteUrl: escala.fuenteUrl,
      observacion: escala.observacion,
    });
  }

  function nuevoDetalle(escala: EscalaSalarial) {
    setError(null);
    setDetalleForm({
      escalaId: escala.id,
      codigoReferencia: "",
      denominacion: "",
      comision: "",
      rama: "",
      estructuraOcupacional: "",
      minimo: "",
      tipoValor: "MENSUAL",
      regla: "MINIMO",
    });
  }

  function editarDetalle(detalle: DetalleEscalaSalarial) {
    setError(null);
    setDetalleForm({
      id: detalle.id,
      escalaId: detalle.escalaId,
      codigoReferencia: detalle.codigoReferencia,
      denominacion: detalle.denominacion,
      comision: detalle.comision,
      rama: detalle.rama,
      estructuraOcupacional: detalle.estructuraOcupacional ?? "",
      minimo: centsToInput(detalle.minimoCent),
      tipoValor: detalle.tipoValor,
      regla: detalle.regla,
    });
  }

  function enviarEscala(evento: React.FormEvent) {
    evento.preventDefault();
    if (!escalaForm) return;
    startTransition(async () => {
      const resultado = await guardarEscala(escalaForm);
      if (resultado.ok) setEscalaForm(null);
      else setError(resultado.error);
    });
  }

  function enviarDetalle(evento: React.FormEvent) {
    evento.preventDefault();
    if (!detalleForm) return;
    startTransition(async () => {
      const resultado = await guardarDetalle(detalleForm);
      if (resultado.ok) setDetalleForm(null);
      else setError(resultado.error);
    });
  }

  const setEscala = <K extends keyof EscalaForm>(campo: K, valor: EscalaForm[K]) =>
    setEscalaForm((actual) => (actual ? { ...actual, [campo]: valor } : actual));
  const setDetalle = <K extends keyof DetalleEscalaForm>(campo: K, valor: DetalleEscalaForm[K]) =>
    setDetalleForm((actual) => (actual ? { ...actual, [campo]: valor } : actual));

  return (
    <>
      <PageHeader
        eyebrow="Configuración"
        icon={SECCIONES.configuracion.icon}
        title="Catálogo salarial"
        description="Valores por régimen y vigencia. Vincule cada cargo interno con su código salarial desde la sección Cargos."
        actions={<Button onClick={nuevaEscala}><Plus /> Nueva escala</Button>}
      />
      <ConfiguracionNav />

      <Alert tone="info" title="Criterio para Código del Trabajo en 2026">
        El catálogo oficial 2025 para una empresa de software se conserva como base. En 2026 se compara cada fila con el piso general de {formatUSD(48200)}
        y se aplica el mayor. La telefonía móvil no está incluida porque corresponde a una rama especializada distinta.
      </Alert>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Alert tone="info" title="LOSEP · escala nacional">
          Incluye los 20 grados, desde Servidor Público de Servicios 1 hasta Servidor Público 14. Al asignar un grado al cargo, su RMU queda controlada como valor fijo.
        </Alert>
        <Alert tone="warning" title="LOEP · escala de cada empresa pública">
          Los procesos gobernantes y adjetivos usan la escala nacional. Para procesos sustantivos, la plantilla está en cero y no bloquea sueldos hasta que configure los valores aprobados por el Directorio y cambie cada regla a mínimo, RMU fija o techo.
        </Alert>
      </div>

      {incumplimientos.length > 0 && (
        <Alert tone="danger" title={`${incumplimientos.length} empleado(s) fuera de su regla salarial`}>
          Revise la RMU, el mínimo o el techo vinculado desde Empleados antes de procesar el siguiente rol.
        </Alert>
      )}

      <div className="my-5 grid gap-4 sm:grid-cols-3">
        <StatCard icon={Scale} label="Versiones registradas" value={escalas.length} />
        <StatCard icon={ListChecks} tone="gold" label="Valores salariales" value={detalles.length} />
        <StatCard
          icon={TriangleAlert}
          tone={incumplimientos.length ? "accent" : "success"}
          label="Alertas salariales"
          value={incumplimientos.length}
        />
      </div>

      <Card className="mb-4">
        <Toolbar className="border-b-0" resumen={`${visibles.length} de ${escalas.length} escalas`}>
        <SearchInput
          placeholder="Buscar grupo, cargo o código"
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
        />
        <Select className="w-56" value={regimenFiltro} onChange={(evento) => setRegimenFiltro(Number(evento.target.value))}>
          <option value={0}>Todos los regímenes</option>
          {regimenes.map((regimen) => <option key={regimen.id} value={regimen.id}>{regimen.nombre}</option>)}
        </Select>
        <Select
          className="w-56"
          value={comisionFiltro}
          onChange={(evento) => {
            setComisionFiltro(evento.target.value);
            setRamaFiltro("");
          }}
        >
          <option value="">Todas las comisiones</option>
          {comisiones.map((comision) => <option key={comision} value={comision}>{comision}</option>)}
        </Select>
        <Select className="w-56" value={ramaFiltro} onChange={(evento) => setRamaFiltro(evento.target.value)}>
          <option value="">Todas las ramas</option>
          {ramas.map((rama) => <option key={rama} value={rama}>{rama}</option>)}
        </Select>
        </Toolbar>
      </Card>

      <div className="space-y-5">
        {visibles.map((escala) => {
          const todasLasFilas = detalles.filter((detalle) => detalle.escalaId === escala.id);
          const filas = todasLasFilas.filter(coincideDetalle);
          return (
            <Card key={escala.id}>
              <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>{escala.nombre}</CardTitle>
                    <RegimenBadge codigo={escala.regimenCodigo} />
                    <Badge tone={toneEstado(escala.estado)}>{ESTADOS[escala.estado]}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {fechaCorta(escala.vigenteDesde)} → {escala.vigenteHasta ? fechaCorta(escala.vigenteHasta) : "vigente"} · {escala.referenciaLegal || "Sin referencia legal"} · {filas.length} de {todasLasFilas.length} valores
                  </p>
                  {escala.observacion && <p className="mt-1 max-w-3xl text-xs text-muted-foreground">{escala.observacion}</p>}
                </div>
                <div className="flex gap-2">
                  {escala.fuenteUrl && <Button asChild variant="outline" size="sm"><a href={escala.fuenteUrl} target="_blank" rel="noreferrer"><ExternalLink /> Fuente</a></Button>}
                  <Button variant="outline" size="sm" onClick={() => editarEscala(escala)}><Pencil /> Editar</Button>
                  <Button size="sm" onClick={() => nuevoDetalle(escala)}><Plus /> Agregar valor</Button>
                </div>
              </CardHeader>
              <Table>
                <THead><TR><TH>Código</TH><TH>Denominación</TH><TH>Comisión / grupo</TH><TH>Estructura</TH><TH>Regla</TH><TH numeric>Valor</TH><TH className="text-right">Acciones</TH></TR></THead>
                <TBody>
                  {filas.map((detalle) => (
                    <TR key={detalle.id}>
                      <TD className="font-mono text-xs">{detalle.codigoReferencia}</TD>
                      <TD><p className="font-medium">{detalle.denominacion}</p></TD>
                      <TD className="max-w-xs"><p className="text-xs">{detalle.comision || "—"}</p>{detalle.rama && <p className="mt-1 text-xs text-muted-foreground">{detalle.rama}</p>}</TD>
                      <TD>{detalle.estructuraOcupacional ? <Badge tone="primary">{detalle.estructuraOcupacional}</Badge> : "—"}</TD>
                      <TD><Badge tone={detalle.regla === "FIJO" ? "primary" : detalle.regla === "REFERENCIA" ? "warning" : "neutral"}>{REGLAS[detalle.regla]}</Badge></TD>
                      <TD numeric className="font-medium">{detalle.regla === "REFERENCIA" && detalle.minimoCent === 0 ? <span className="text-muted-foreground">Por configurar</span> : formatUSD(detalle.minimoCent)}</TD>
                      <TD className="text-right"><Button variant="ghost" size="icon" title="Editar valor" onClick={() => editarDetalle(detalle)}><Pencil /></Button></TD>
                    </TR>
                  ))}
                  {filas.length === 0 && <EmptyRow colSpan={7}>No hay valores que coincidan con los filtros.</EmptyRow>}
                </TBody>
              </Table>
            </Card>
          );
        })}
      </div>

      {incumplimientos.length > 0 && (
        <Card className="mt-5">
          <CardHeader><CardTitle>Personal fuera de la regla salarial</CardTitle></CardHeader>
          <Table><THead><TR><TH>Empleado</TH><TH>Cargo</TH><TH>Régimen</TH><TH>Regla</TH><TH numeric>Sueldo</TH><TH numeric>Valor escala</TH></TR></THead><TBody>
            {incumplimientos.map((item) => <TR key={item.empleadoId}><TD className="font-medium">{item.empleado}</TD><TD>{item.cargo}</TD><TD><RegimenBadge codigo={item.regimenCodigo} /></TD><TD><Badge>{REGLAS[item.regla]}</Badge></TD><TD numeric>{formatUSD(item.sueldoCent)}</TD><TD numeric className="text-destructive">{formatUSD(item.minimoCent)}</TD></TR>)}
          </TBody></Table>
        </Card>
      )}

      <Dialog open={!!escalaForm} onOpenChange={(abierto) => !abierto && setEscalaForm(null)}>
        {escalaForm && <DialogContent title={escalaForm.id ? "Editar versión de escala" : "Nueva versión de escala"} className="max-w-2xl">
          <form onSubmit={enviarEscala} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Régimen"><Select value={escalaForm.regimenId} onChange={(e) => setEscala("regimenId", Number(e.target.value))}>{regimenes.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}</Select></Field>
              <Field label="Año"><Input type="number" min={2000} max={2200} value={escalaForm.anio} onChange={(e) => setEscala("anio", Number(e.target.value))} required /></Field>
              <Field label="Nombre"><Input value={escalaForm.nombre} onChange={(e) => setEscala("nombre", e.target.value)} required /></Field>
              <Field label="Estado"><Select value={escalaForm.estado} onChange={(e) => setEscala("estado", e.target.value as EscalaForm["estado"])}>{Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
              <Field label="Vigente desde"><Input type="date" value={escalaForm.vigenteDesde} onChange={(e) => setEscala("vigenteDesde", e.target.value)} required /></Field>
              <Field label="Vigente hasta" hint="Opcional; una nueva versión puede cerrar automáticamente la anterior"><Input type="date" value={escalaForm.vigenteHasta} onChange={(e) => setEscala("vigenteHasta", e.target.value)} /></Field>
              <Field label="Acuerdo o referencia legal"><Input value={escalaForm.referenciaLegal} onChange={(e) => setEscala("referenciaLegal", e.target.value)} /></Field>
              <Field label="URL de la fuente"><Input type="url" value={escalaForm.fuenteUrl} onChange={(e) => setEscala("fuenteUrl", e.target.value)} placeholder="https://..." /></Field>
              <Field label="Observación" className="sm:col-span-2"><Input value={escalaForm.observacion} onChange={(e) => setEscala("observacion", e.target.value)} /></Field>
            </div>
            {error && <Alert tone="danger">{error}</Alert>}
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEscalaForm(null)}>Cancelar</Button><Button type="submit" disabled={pending}>{pending ? "Guardando…" : escalaForm.id ? "Guardar cambios" : "Crear escala"}</Button></div>
          </form>
        </DialogContent>}
      </Dialog>

      <Dialog open={!!detalleForm} onOpenChange={(abierto) => !abierto && setDetalleForm(null)}>
        {detalleForm && <DialogContent title={detalleForm.id ? "Editar valor salarial" : "Agregar valor salarial"} className="max-w-2xl">
          <form onSubmit={enviarDetalle} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Código estable" hint="Use el mismo código en años posteriores"><Input value={detalleForm.codigoReferencia} onChange={(e) => setDetalle("codigoReferencia", e.target.value)} required /></Field>
              <Field label="Denominación"><Input value={detalleForm.denominacion} onChange={(e) => setDetalle("denominacion", e.target.value)} required /></Field>
              <Field label="Comisión / grupo"><Input value={detalleForm.comision} onChange={(e) => setDetalle("comision", e.target.value)} /></Field>
              <Field label="Rama / grado"><Input value={detalleForm.rama} onChange={(e) => setDetalle("rama", e.target.value)} /></Field>
              <Field label="Estructura ocupacional"><Select value={detalleForm.estructuraOcupacional} onChange={(e) => setDetalle("estructuraOcupacional", e.target.value as DetalleEscalaForm["estructuraOcupacional"])}><option value="">No aplica</option>{ESTRUCTURAS_OCUPACIONALES.map((item) => <option key={item.codigo} value={item.codigo}>{item.codigo} · {item.nombre}</option>)}</Select></Field>
              <Field label="Tipo"><Select value={detalleForm.tipoValor} onChange={(e) => setDetalle("tipoValor", e.target.value as DetalleEscalaForm["tipoValor"])}><option value="MENSUAL">Sueldo mensual</option><option value="TARIFA">Tarifa por unidad</option></Select></Field>
              <Field label="Regla de control"><Select value={detalleForm.regla} onChange={(e) => setDetalle("regla", e.target.value as DetalleEscalaForm["regla"])}>{Object.entries(REGLAS).map(([codigo, nombre]) => <option key={codigo} value={codigo}>{nombre}</option>)}</Select></Field>
              <Field label="Valor (USD)" hint={detalleForm.regla === "REFERENCIA" ? "Puede quedar en 0 mientras se configura" : "Debe ser mayor a cero"}><Input inputMode="decimal" step="0.01" min={detalleForm.regla === "REFERENCIA" ? 0 : 0.01} value={detalleForm.minimo} onChange={(e) => setDetalle("minimo", e.target.value)} required /></Field>
            </div>
            {error && <Alert tone="danger">{error}</Alert>}
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setDetalleForm(null)}>Cancelar</Button><Button type="submit" disabled={pending}>{pending ? "Guardando…" : "Guardar valor"}</Button></div>
          </form>
        </DialogContent>}
      </Dialog>
    </>
  );
}
