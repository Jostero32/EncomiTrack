"use client";

import { useMemo, useState, useTransition } from "react";
import { BriefcaseBusiness, Check, Pencil, Plus, Power, SlidersHorizontal, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Badge, Card, PageHeader } from "@/components/ui/card";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useConfirm } from "@/components/ui/confirm";
import { EmptyRow } from "@/components/ui/empty-state";
import { SearchInput, Toolbar } from "@/components/ui/toolbar";
import { RegimenBadge } from "@/components/regimen-badge";
import { SECCIONES } from "@/lib/navegacion";
import { ESTRUCTURAS_OCUPACIONALES, getEstructuraOcupacional } from "@/lib/estructura-ocupacional";
import { formatUSD } from "@/lib/money";
import type { Cargo, DetalleEscalaSalarial, Regimen } from "@/lib/repo";
import { cambiarEstadoCargo, guardarCargo, type CargoForm } from "./actions";

const VACIO: CargoForm = { nombre: "", estructuraOcupacional: "", descripcion: "", asignacionesSalariales: {}, reportaAId: 0 };
const REGLAS = { MINIMO: "mínimo", FIJO: "RMU fija", TECHO: "techo", REFERENCIA: "referencia" } as const;
const normalizar = (texto: string) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function CargosClient({
  cargos,
  regimenes,
  opcionesEscala,
}: {
  cargos: Cargo[];
  regimenes: Regimen[];
  opcionesEscala: DetalleEscalaSalarial[];
}) {
  const [busqueda, setBusqueda] = useState("");
  const [verInactivos, setVerInactivos] = useState(false);
  const [form, setForm] = useState<CargoForm | null>(null);
  const [editandoClasificaciones, setEditandoClasificaciones] = useState(false);
  const [regimenEscalaId, setRegimenEscalaId] = useState(regimenes[0]?.id ?? 0);
  const [busquedaEscala, setBusquedaEscala] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const confirmar = useConfirm();

  const filtrados = useMemo(() => {
    const consulta = busqueda.trim().toLowerCase();
    return cargos.filter(
      (cargo) =>
        (verInactivos || cargo.activo) &&
        (!consulta || `${cargo.nombre} ${cargo.estructuraOcupacional ?? ""} ${cargo.descripcion}`.toLowerCase().includes(consulta)),
    );
  }, [busqueda, cargos, verInactivos]);

  function editar(cargo: Cargo) {
    setError(null);
    setEditandoClasificaciones(false);
    setForm({
      id: cargo.id,
      nombre: cargo.nombre,
      estructuraOcupacional: cargo.estructuraOcupacional ?? "",
      descripcion: cargo.descripcion,
      asignacionesSalariales: { ...cargo.asignacionesSalariales },
      reportaAId: cargo.reportaAId ?? 0,
    });
  }

  const nombreCargo = (id: number | null) => cargos.find((cargo) => cargo.id === id)?.nombre;

  /** Cargos que dependen (directa o indirectamente) del cargo indicado: no pueden ser su superior. */
  function subordinados(id: number): Set<number> {
    const resultado = new Set<number>();
    const pendientes = [id];
    while (pendientes.length) {
      const actual = pendientes.pop()!;
      for (const cargo of cargos) {
        if (cargo.reportaAId === actual && !resultado.has(cargo.id)) {
          resultado.add(cargo.id);
          pendientes.push(cargo.id);
        }
      }
    }
    return resultado;
  }

  function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!form) return;
    startTransition(async () => {
      const resultado = await guardarCargo(form);
      if (resultado.ok) setForm(null);
      else setError(resultado.error);
    });
  }

  const set = <K extends keyof CargoForm>(campo: K, valor: CargoForm[K]) =>
    setForm((actual) => (actual ? { ...actual, [campo]: valor } : actual));

  function cambiarAsignacion(regimenId: number, codigoReferencia: string) {
    setForm((actual) => {
      if (!actual) return actual;
      const opcion = opcionesEscala.find(
        (item) => item.regimenId === regimenId && item.codigoReferencia === codigoReferencia,
      );
      const asignacionesSalariales = { ...actual.asignacionesSalariales };
      if (codigoReferencia) asignacionesSalariales[String(regimenId)] = codigoReferencia;
      else delete asignacionesSalariales[String(regimenId)];
      return {
        ...actual,
        estructuraOcupacional: opcion?.estructuraOcupacional ?? actual.estructuraOcupacional,
        asignacionesSalariales,
      };
    });
  }

  const regimenCt = regimenes.find((regimen) => regimen.codigo === "CT");
  const pisoCt = opcionesEscala.find(
    (opcion) => opcion.regimenId === regimenCt?.id && opcion.codigoReferencia === "SBU-GENERAL",
  );
  const minimoAplicable = (opcion: DetalleEscalaSalarial) =>
    opcion.regimenId === regimenCt?.id && opcion.tipoValor === "MENSUAL"
      ? Math.max(opcion.minimoCent, pisoCt?.minimoCent ?? 0)
      : opcion.minimoCent;
  const valorOEstado = (opcion: DetalleEscalaSalarial) =>
    opcion.regla === "REFERENCIA" && opcion.minimoCent === 0 ? "Por configurar" : formatUSD(minimoAplicable(opcion));
  const codigoCt = form && regimenCt ? form.asignacionesSalariales[String(regimenCt.id)] : "";
  const clasificacionCt = codigoCt
    ? opcionesEscala.find((opcion) => opcion.regimenId === regimenCt?.id && opcion.codigoReferencia === codigoCt)
    : undefined;
  const opcionesRegimen = useMemo(
    () => opcionesEscala.filter((opcion) => opcion.regimenId === regimenEscalaId),
    [opcionesEscala, regimenEscalaId],
  );
  const resultadosEscala = useMemo(() => {
    const consultaEscala = normalizar(busquedaEscala.trim());
    return opcionesRegimen.filter((opcion) =>
      !consultaEscala ||
      normalizar(
        `${opcion.denominacion} ${opcion.codigoReferencia} ${opcion.comision} ${opcion.rama} ${opcion.estructuraOcupacional ?? ""}`,
      ).includes(consultaEscala),
    );
  }, [opcionesRegimen, busquedaEscala]);
  const codigoEscalaSeleccionado = form?.asignacionesSalariales[String(regimenEscalaId)] ?? "";
  const opcionEscalaSeleccionada = opcionesRegimen.find(
    (opcion) => opcion.codigoReferencia === codigoEscalaSeleccionado,
  );

  return (
    <>
      <PageHeader
        icon={SECCIONES.cargos.icon}
        title="Cargos"
        description="Catálogo maestro de puestos y su ubicación automática en la estructura organizacional."
        actions={
          <Button
            onClick={() => {
              setError(null);
              setEditandoClasificaciones(false);
              setForm({ ...VACIO });
            }}
          >
            <Plus /> Nuevo cargo
          </Button>
        }
      />

      <Alert tone="info">
        Al cambiar la estructura de un cargo, todos los empleados que lo ocupan se reubican automáticamente en el organigrama.
      </Alert>

      <Card className="mt-5">
        <Toolbar resumen={`${filtrados.length} cargos`}>
          <SearchInput
            placeholder="Buscar cargo o estructura"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
          />
          <Checkbox label="Mostrar inactivos" checked={verInactivos} onChange={(evento) => setVerInactivos(evento.target.checked)} />
        </Toolbar>

        <Table>
          <THead>
            <TR>
              <TH>Estructura</TH>
              <TH>Cargo</TH>
              <TH>Descripción</TH>
              <TH>Escalas salariales</TH>
              <TH>Personal</TH>
              <TH>Estado</TH>
              <TH className="text-right">Acciones</TH>
            </TR>
          </THead>
          <TBody>
            {filtrados.map((cargo) => (
              <TR key={cargo.id} className={cargo.activo ? "" : "opacity-60"}>
                <TD>
                  {cargo.estructuraOcupacional ? (
                    <Badge tone="primary" title={getEstructuraOcupacional(cargo.estructuraOcupacional).nombre}>
                      {cargo.estructuraOcupacional}
                    </Badge>
                  ) : (
                    <Badge tone="warning">Por clasificar</Badge>
                  )}
                </TD>
                <TD>
                  <span className="flex items-center gap-2 font-medium">
                    <BriefcaseBusiness className="size-4 text-muted-foreground" /> {cargo.nombre}
                  </span>
                  <span className="mt-0.5 block pl-6 text-xs text-muted-foreground">
                    {cargo.reportaAId ? `Reporta a: ${nombreCargo(cargo.reportaAId) ?? "—"}` : "Cabeza del organigrama"}
                  </span>
                </TD>
                <TD className="max-w-sm text-muted-foreground">{cargo.descripcion || "—"}</TD>
                <TD>
                  <div className="flex flex-wrap gap-1">
                    {regimenes
                      .filter((regimen) => cargo.asignacionesSalariales[String(regimen.id)])
                      .map((regimen) => {
                        const codigo = cargo.asignacionesSalariales[String(regimen.id)];
                        const opcion = opcionesEscala.find(
                          (item) => item.regimenId === regimen.id && item.codigoReferencia === codigo,
                        );
                        return (
                          <div key={regimen.id} className="min-w-48 rounded-md border bg-muted/30 px-2 py-1.5 text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <RegimenBadge codigo={regimen.codigo} />
                              <span className="font-medium">{opcion ? valorOEstado(opcion) : "Sin valor"}</span>
                            </div>
                            <p className="mt-1 line-clamp-2 text-muted-foreground">{opcion?.denominacion ?? codigo}</p>
                            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{codigo}</p>
                          </div>
                        );
                      })}
                    {Object.keys(cargo.asignacionesSalariales).length === 0 && <Badge tone="warning">Sin vincular</Badge>}
                  </div>
                </TD>
                <TD>
                  <span className="inline-flex items-center gap-1.5 text-sm">
                    <Users className="size-4 text-muted-foreground" /> {cargo.empleados}
                  </span>
                </TD>
                <TD>{cargo.activo ? <Badge tone="success">Activo</Badge> : <Badge>Inactivo</Badge>}</TD>
                <TD className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" title="Editar" onClick={() => editar(cargo)}>
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title={cargo.activo ? "Desactivar" : "Activar"}
                      disabled={pending}
                      onClick={async () => {
                        if (
                          cargo.activo &&
                          !(await confirmar({
                            titulo: `¿Desactivar el cargo ${cargo.nombre}?`,
                            mensaje: cargo.empleados
                              ? `Seguirá asignado a ${cargo.empleados} empleado(s), pero no se ofrecerá para nuevas asignaciones.`
                              : "No se ofrecerá para nuevas asignaciones.",
                            confirmar: "Desactivar",
                            tono: "destructive",
                          }))
                        )
                          return;
                        startTransition(async () => {
                          const resultado = await cambiarEstadoCargo(cargo.id, !cargo.activo);
                          if (!resultado.ok) setError(resultado.error);
                        });
                      }}
                    >
                      <Power className={cargo.activo ? "text-destructive" : "text-success"} />
                    </Button>
                  </div>
                </TD>
              </TR>
            ))}
            {filtrados.length === 0 && <EmptyRow colSpan={7}>No hay cargos que coincidan con la búsqueda.</EmptyRow>}
          </TBody>
        </Table>
      </Card>

      <Dialog
        open={!!form}
        onOpenChange={(abierto) => {
          if (!abierto) {
            setForm(null);
            setEditandoClasificaciones(false);
            setBusquedaEscala("");
          }
        }}
      >
        {form && (
          <DialogContent title={form.id ? "Editar cargo" : "Nuevo cargo"} className="max-w-2xl">
            <form onSubmit={guardar} className="space-y-4">
              <Field label="Nombre del cargo">
                <Input value={form.nombre} required autoFocus onChange={(evento) => set("nombre", evento.target.value)} />
              </Field>
              <Field
                label="Estructura ocupacional"
                hint={
                  clasificacionCt?.estructuraOcupacional
                    ? `Heredada del cargo oficial: ${clasificacionCt.denominacion}`
                    : "Esta selección ubicará automáticamente a sus empleados en el organigrama"
                }
              >
                <Select
                  value={form.estructuraOcupacional}
                  required
                  disabled={!!clasificacionCt?.estructuraOcupacional}
                  onChange={(evento) => set("estructuraOcupacional", evento.target.value as CargoForm["estructuraOcupacional"])}
                >
                  <option value="" disabled>
                    Seleccione un nivel
                  </option>
                  {ESTRUCTURAS_OCUPACIONALES.map((estructura) => (
                    <option key={estructura.codigo} value={estructura.codigo}>
                      {estructura.codigo} · {estructura.nombre}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Reporta a"
                hint="Cargo del superior inmediato. Define el organigrama por jerarquía; déjelo vacío solo para la cabeza de la empresa."
              >
                <Select value={form.reportaAId} onChange={(evento) => set("reportaAId", Number(evento.target.value))}>
                  <option value={0}>— Ninguno (cabeza del organigrama) —</option>
                  {(() => {
                    const excluidos = form.id ? subordinados(form.id) : new Set<number>();
                    return cargos
                      .filter((cargo) => cargo.id !== form.id && !excluidos.has(cargo.id) && (cargo.activo || cargo.id === form.reportaAId))
                      .map((cargo) => (
                        <option key={cargo.id} value={cargo.id}>
                          {cargo.estructuraOcupacional ?? "—"} · {cargo.nombre}
                        </option>
                      ));
                  })()}
                </Select>
              </Field>
              <Field label="Descripción" hint="Opcional: funciones o alcance principal del puesto">
                <Input value={form.descripcion} onChange={(evento) => set("descripcion", evento.target.value)} />
              </Field>
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Clasificación salarial</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {Object.keys(form.asignacionesSalariales).length
                        ? `${Object.keys(form.asignacionesSalariales).length} régimen(es) vinculado(s)`
                        : "Este cargo todavía no tiene clasificaciones vinculadas"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const primerRegimenSinAsignar = regimenes.find(
                        (regimen) => !form.asignacionesSalariales[String(regimen.id)],
                      );
                      setRegimenEscalaId(primerRegimenSinAsignar?.id ?? regimenes[0]?.id ?? 0);
                      setBusquedaEscala("");
                      setEditandoClasificaciones(true);
                    }}
                  >
                    <SlidersHorizontal /> Configurar
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {regimenes.map((regimen) => {
                    const codigo = form.asignacionesSalariales[String(regimen.id)];
                    const opcion = opcionesEscala.find(
                      (item) => item.regimenId === regimen.id && item.codigoReferencia === codigo,
                    );
                    return codigo ? (
                      <div key={regimen.id} className="rounded-md border bg-card px-3 py-2 text-xs">
                        <div className="flex items-center gap-2">
                          <RegimenBadge codigo={regimen.codigo} />
                          <span className="font-medium">{opcion ? valorOEstado(opcion) : "Sin valor"}</span>
                        </div>
                        <p className="mt-1 max-w-52 truncate text-muted-foreground">{opcion?.denominacion ?? codigo}</p>
                      </div>
                    ) : null;
                  })}
                  {Object.keys(form.asignacionesSalariales).length === 0 && <Badge tone="warning">Sin vincular</Badge>}
                </div>
              </div>
              {error && <Alert tone="danger">{error}</Alert>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setForm(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Guardando…" : "Guardar cargo"}
                </Button>
              </div>
            </form>
          </DialogContent>
        )}
      </Dialog>

      <Dialog
        open={editandoClasificaciones}
        onOpenChange={(abierto) => {
          setEditandoClasificaciones(abierto);
          if (!abierto) setBusquedaEscala("");
        }}
      >
        {form && (
          <DialogContent
            title="Clasificación salarial"
            description={`${form.nombre || "Cargo nuevo"}: busque y seleccione una clasificación para cada régimen aplicable.`}
            className="max-w-4xl"
          >
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 border-b pb-4">
                {regimenes.map((regimen) => {
                  const asignada = form.asignacionesSalariales[String(regimen.id)];
                  return (
                    <Button
                      key={regimen.id}
                      type="button"
                      variant={regimenEscalaId === regimen.id ? "default" : "outline"}
                      onClick={() => {
                        setRegimenEscalaId(regimen.id);
                        setBusquedaEscala("");
                      }}
                    >
                      {regimen.codigo}
                      {asignada && <Check />}
                    </Button>
                  );
                })}
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <SearchInput
                  autoFocus
                  className="max-w-none"
                  placeholder="Buscar por cargo, código, grupo o grado"
                  value={busquedaEscala}
                  onChange={(evento) => setBusquedaEscala(evento.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!codigoEscalaSeleccionado}
                  onClick={() => cambiarAsignacion(regimenEscalaId, "")}
                >
                  Quitar vínculo
                </Button>
              </div>

              {opcionEscalaSeleccionada && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="primary">Seleccionada</Badge>
                    <p className="font-medium">{opcionEscalaSeleccionada.denominacion}</p>
                    <span className="ml-auto font-semibold">{valorOEstado(opcionEscalaSeleccionada)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {opcionEscalaSeleccionada.codigoReferencia} · {opcionEscalaSeleccionada.rama || opcionEscalaSeleccionada.comision || "Sin grupo"} · {REGLAS[opcionEscalaSeleccionada.regla]}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{resultadosEscala.length} resultado(s)</span>
                <span>{regimenes.find((regimen) => regimen.id === regimenEscalaId)?.nombre}</span>
              </div>
              <div className="max-h-[48vh] overflow-y-auto rounded-lg border">
                {resultadosEscala.map((opcion) => {
                  const seleccionada = opcion.codigoReferencia === codigoEscalaSeleccionado;
                  return (
                    <button
                      key={`${opcion.regimenId}-${opcion.codigoReferencia}`}
                      type="button"
                      aria-pressed={seleccionada}
                      className={`flex w-full items-start gap-3 border-b px-4 py-3 text-left last:border-b-0 hover:bg-muted/60 ${
                        seleccionada ? "bg-primary/5" : ""
                      }`}
                      onClick={() => cambiarAsignacion(opcion.regimenId, opcion.codigoReferencia)}
                    >
                      <span
                        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border ${
                          seleccionada ? "border-primary bg-primary text-primary-foreground" : "border-input"
                        }`}
                      >
                        {seleccionada && <Check className="size-3" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{opcion.denominacion}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {opcion.comision || opcion.escalaNombre}
                          {opcion.rama ? ` · ${opcion.rama}` : ""}
                        </span>
                        <span className="mt-1 block font-mono text-[11px] text-muted-foreground">
                          {opcion.codigoReferencia}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-semibold">{valorOEstado(opcion)}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {opcion.estructuraOcupacional ?? (opcion.rama || "—")} · {REGLAS[opcion.regla]}
                        </span>
                      </span>
                    </button>
                  );
                })}
                {resultadosEscala.length === 0 && (
                  <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No hay clasificaciones que coincidan con la búsqueda.
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => {
                    setEditandoClasificaciones(false);
                    setBusquedaEscala("");
                  }}
                >
                  Listo
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
