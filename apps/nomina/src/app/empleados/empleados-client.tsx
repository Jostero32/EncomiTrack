"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { History, Pencil, Plus, Power } from "lucide-react";
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
import { fechaCorta } from "@/lib/periodo";
import { validarCedula } from "@/lib/cedula";
import { getEstructuraOcupacional } from "@/lib/estructura-ocupacional";
import { centsToInput, formatUSD } from "@/lib/money";
import type { Cargo, Empleado, HistorialSueldo, ReferenciaSalarialCargo, Regimen } from "@/lib/repo";
import { cambiarEstadoEmpleado, guardarEmpleado, type EmpleadoForm } from "./actions";

const REGIONES = { SIERRA_ORIENTE: "Sierra / Amazonía", COSTA_GALAPAGOS: "Costa / Galápagos" } as const;
const REGLAS = { MINIMO: "Mínimo", FIJO: "RMU fija", TECHO: "Techo", REFERENCIA: "Referencia" } as const;

function vacio(regimenId: number, cargoId: number, hoy: string): EmpleadoForm {
  return {
    cedula: "",
    nombres: "",
    apellidos: "",
    cargoId,
    regimenId,
    sueldo: "",
    sueldoVigenteDesde: hoy,
    motivoCambioSueldo: "Sueldo de ingreso",
    fechaIngreso: hoy,
    region: "SIERRA_ORIENTE",
    mensualiza13: true,
    mensualiza14: true,
    aplicaFondosReserva: true,
    fondosReservaModalidad: "DIRECTO",
    condicionesVigenteDesde: hoy,
  };
}

export function EmpleadosClient({
  empleados,
  regimenes,
  cargos,
  referencias,
  historialSueldos,
  hoy,
}: {
  empleados: Empleado[];
  regimenes: Regimen[];
  cargos: Cargo[];
  referencias: ReferenciaSalarialCargo[];
  historialSueldos: HistorialSueldo[];
  hoy: string;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [verInactivos, setVerInactivos] = useState(false);
  const [form, setForm] = useState<EmpleadoForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [historialEmpleadoId, setHistorialEmpleadoId] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const confirmar = useConfirm();

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return empleados.filter(
      (e) =>
        (verInactivos || e.activo) &&
        (!q || `${e.cedula} ${e.nombres} ${e.apellidos} ${e.cargo} ${e.estructuraOcupacional ?? ""}`.toLowerCase().includes(q)),
    );
  }, [empleados, busqueda, verInactivos]);

  function editar(e: Empleado) {
    setError(null);
    setForm({
      id: e.id,
      cedula: e.cedula,
      nombres: e.nombres,
      apellidos: e.apellidos,
      cargoId: e.cargoId ?? 0,
      regimenId: e.regimenId,
      sueldo: centsToInput(e.sueldoBaseCent),
      sueldoVigenteDesde: hoy,
      motivoCambioSueldo: "Actualización salarial",
      fechaIngreso: e.fechaIngreso,
      region: e.region,
      mensualiza13: e.mensualiza13,
      mensualiza14: e.mensualiza14,
      aplicaFondosReserva: e.aplicaFondosReserva,
      fondosReservaModalidad: e.fondosReservaModalidad ?? "DIRECTO",
      condicionesVigenteDesde: hoy,
    });
  }

  function guardar(ev: React.FormEvent) {
    ev.preventDefault();
    if (!form) return;
    if (!validarCedula(form.cedula.trim())) {
      setError("La cédula no es válida (verificación módulo 10)");
      return;
    }
    startTransition(async () => {
      const r = await guardarEmpleado(form);
      if (r.ok) setForm(null);
      else setError(r.error);
    });
  }

  const set = <K extends keyof EmpleadoForm>(k: K, v: EmpleadoForm[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  function minimoPara(datos: Pick<EmpleadoForm, "cargoId" | "regimenId" | "sueldoVigenteDesde">) {
    const prioridad = { OFICIAL: 4, TRANSITORIA: 3, REFERENCIAL: 2, BORRADOR: 1 } as const;
    const candidatos = referencias
      .filter(
        (referencia) =>
          referencia.cargoId === datos.cargoId &&
          referencia.regimenId === datos.regimenId &&
          referencia.vigenteDesde <= datos.sueldoVigenteDesde,
      )
      .sort((a, b) => {
        const porFecha = b.vigenteDesde.localeCompare(a.vigenteDesde);
        if (porFecha) return porFecha;
        return prioridad[b.escalaEstado] - prioridad[a.escalaEstado];
      });
    const ultimos = new Map<string, ReferenciaSalarialCargo>();
    for (const candidato of candidatos) {
      if (!ultimos.has(candidato.codigoReferencia)) ultimos.set(candidato.codigoReferencia, candidato);
    }
    const cargo = cargos.find((item) => item.id === datos.cargoId);
    const codigoAsignado = cargo?.asignacionesSalariales[String(datos.regimenId)];
    const clasificacion = codigoAsignado ? ultimos.get(codigoAsignado) : undefined;
    if (clasificacion?.tipoValor === "TARIFA") return clasificacion;
    const piso = ultimos.get("SBU-GENERAL");
    if (!clasificacion) return piso;
    return piso && piso.minimoCent > clasificacion.minimoCent ? piso : clasificacion;
  }

  function cambiarClasificador(campo: "cargoId" | "regimenId", valor: number) {
    setForm((actual) => {
      if (!actual) return actual;
      const siguiente = { ...actual, [campo]: valor };
      const minimo = minimoPara(siguiente);
      ajustarValorEscala(siguiente, minimo);
      return siguiente;
    });
  }

  function ajustarValorEscala(siguiente: EmpleadoForm, referencia = minimoPara(siguiente)) {
    const sueldoCent = Math.round((Number.parseFloat(siguiente.sueldo || "0") || 0) * 100);
    if (referencia?.tipoValor !== "MENSUAL" || referencia.regla === "REFERENCIA") return siguiente;
    if (
      referencia.regla === "FIJO" ||
      (referencia.regla === "MINIMO" && sueldoCent < referencia.minimoCent) ||
      (referencia.regla === "TECHO" && sueldoCent > referencia.minimoCent)
    ) {
      siguiente.sueldo = centsToInput(referencia.minimoCent);
    }
    return siguiente;
  }

  function ajustarMinimo(siguiente: EmpleadoForm) {
    return ajustarValorEscala(siguiente);
  }

  function cambiarFechaIngreso(fechaIngreso: string) {
    setForm((actual) => {
      if (!actual) return actual;
      const siguiente = {
        ...actual,
        fechaIngreso,
        sueldoVigenteDesde: actual.id ? actual.sueldoVigenteDesde : fechaIngreso,
        condicionesVigenteDesde: actual.id ? actual.condicionesVigenteDesde : fechaIngreso,
      };
      return ajustarMinimo(siguiente);
    });
  }

  function cambiarVigenciaSueldo(sueldoVigenteDesde: string) {
    setForm((actual) => (actual ? ajustarMinimo({ ...actual, sueldoVigenteDesde }) : actual));
  }
  const cedulaInvalida = !!form && form.cedula.length === 10 && !validarCedula(form.cedula);
  const cargosActivos = cargos.filter((cargo) => cargo.activo);
  const cargoSeleccionado = form ? cargos.find((cargo) => cargo.id === form.cargoId) : undefined;
  const minimoSeleccionado = form ? minimoPara(form) : undefined;
  const historialSeleccionado = historialSueldos.filter((item) => item.empleadoId === historialEmpleadoId);

  return (
    <>
      <PageHeader
        icon={SECCIONES.empleados.icon}
        title="Empleados"
        description="Registro del personal y su configuración de pago."
        actions={
          <Button
            disabled={cargosActivos.length === 0}
            onClick={() => {
              setError(null);
              const nuevo = vacio(regimenes[0]?.id ?? 1, cargosActivos[0]?.id ?? 0, hoy);
              const minimo = minimoPara(nuevo);
              if (minimo?.tipoValor === "MENSUAL" && !(minimo.regla === "REFERENCIA" && minimo.minimoCent === 0)) {
                nuevo.sueldo = centsToInput(minimo.minimoCent);
              }
              setForm(nuevo);
            }}
          >
            <Plus /> Nuevo empleado
          </Button>
        }
      />

      {cargosActivos.length === 0 && (
        <Alert tone="warning" title="Primero cree un cargo">
          No hay cargos activos disponibles. Abra <Link href="/cargos" className="font-semibold underline">Cargos</Link> y registre al menos uno antes de agregar empleados.
        </Alert>
      )}

      <Card className={cargosActivos.length === 0 ? "mt-5" : ""}>
        <Toolbar resumen={`${filtrados.length} registros`}>
          <SearchInput placeholder="Buscar por cédula, nombre o cargo" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          <Checkbox label="Mostrar inactivos" checked={verInactivos} onChange={(e) => setVerInactivos(e.target.checked)} />
        </Toolbar>
        <Table>
          <THead>
            <TR>
              <TH>Empleado</TH>
              <TH>Cargo</TH>
              <TH>Estructura</TH>
              <TH>Régimen</TH>
              <TH numeric>Regla salarial</TH>
              <TH numeric>Sueldo base</TH>
              <TH>Ingreso</TH>
              <TH>Décimos</TH>
              <TH>F. reserva</TH>
              <TH>Estado</TH>
              <TH className="text-right">Acciones</TH>
            </TR>
          </THead>
          <TBody>
            {filtrados.map((e) => (
              (() => {
                const minimo = e.cargoId
                  ? minimoPara({ cargoId: e.cargoId, regimenId: e.regimenId, sueldoVigenteDesde: hoy })
                  : undefined;
                const cumple = !minimo || minimo.tipoValor !== "MENSUAL" || minimo.regla === "REFERENCIA" ||
                  (minimo.regla === "MINIMO" && e.sueldoBaseCent >= minimo.minimoCent) ||
                  (minimo.regla === "FIJO" && e.sueldoBaseCent === minimo.minimoCent) ||
                  (minimo.regla === "TECHO" && e.sueldoBaseCent <= minimo.minimoCent);
                return (
              <TR key={e.id} className={e.activo ? "" : "opacity-60"}>
                <TD className="min-w-40">
                  <p className="font-medium">
                    {e.apellidos} {e.nombres}
                  </p>
                  <p className="tabular text-xs text-muted-foreground">{e.cedula}</p>
                </TD>
                <TD className="text-muted-foreground">{e.cargo}</TD>
                <TD>
                  {e.estructuraOcupacional ? (
                    <Badge tone="primary" title={getEstructuraOcupacional(e.estructuraOcupacional).nombre}>
                      {e.estructuraOcupacional}
                    </Badge>
                  ) : (
                    <Badge tone="warning">Por clasificar</Badge>
                  )}
                </TD>
                <TD>
                  <RegimenBadge codigo={e.regimenCodigo} />
                </TD>
                <TD numeric>
                  {minimo?.tipoValor === "MENSUAL" ? (
                    <span className="block" title={`${minimo.denominacion} · ${minimo.escalaNombre}`}>
                      <span className="block">
                        {minimo.regla === "REFERENCIA" && minimo.minimoCent === 0 ? "Por configurar" : formatUSD(minimo.minimoCent)}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {REGLAS[minimo.regla]}
                        {!cumple && <Badge tone="danger" className="ml-1">No cumple</Badge>}
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Sin vincular</span>
                  )}
                </TD>
                <TD numeric>{formatUSD(e.sueldoBaseCent)}</TD>
                <TD className="tabular whitespace-nowrap">{fechaCorta(e.fechaIngreso)}</TD>
                <TD className="whitespace-nowrap text-xs text-muted-foreground">
                  <p>13.º {e.mensualiza13 ? "mensual" : "acumula"}</p>
                  <p>14.º {e.mensualiza14 ? "mensual" : "acumula"}</p>
                </TD>
                <TD className="whitespace-nowrap text-xs text-muted-foreground">{e.fondosReservaModalidad === "IESS" ? "Depósito IESS" : "Pago directo"}</TD>
                <TD>{e.activo ? <Badge tone="success">Activo</Badge> : <Badge>Inactivo</Badge>}</TD>
                <TD className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" title="Editar" onClick={() => editar(e)}>
                      <Pencil />
                    </Button>
                    <Button variant="ghost" size="icon" title="Historial salarial" onClick={() => setHistorialEmpleadoId(e.id)}>
                      <History />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title={e.activo ? "Desactivar" : "Activar"}
                      disabled={pending}
                      onClick={async () => {
                        if (
                          e.activo &&
                          !(await confirmar({
                            titulo: `¿Desactivar a ${e.nombres} ${e.apellidos}?`,
                            mensaje: "No se incluirá en nuevos roles. Podrá activarlo de nuevo cuando lo necesite.",
                            confirmar: "Desactivar",
                            tono: "destructive",
                          }))
                        )
                          return;
                        startTransition(async () => {
                          await cambiarEstadoEmpleado(e.id, !e.activo);
                        });
                      }}
                    >
                      <Power className={e.activo ? "text-destructive" : "text-success"} />
                    </Button>
                  </div>
                </TD>
              </TR>
                );
              })()
            ))}
            {filtrados.length === 0 && <EmptyRow colSpan={11}>No hay empleados que coincidan con la búsqueda.</EmptyRow>}
          </TBody>
        </Table>
      </Card>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        {form && (
          <DialogContent title={form.id ? "Editar empleado" : "Nuevo empleado"} className="max-w-2xl">
            <form onSubmit={guardar} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Cédula" hint={cedulaInvalida ? "Cédula inválida" : "10 dígitos, validación módulo 10"}>
                  <Input
                    value={form.cedula}
                    maxLength={10}
                    inputMode="numeric"
                    required
                    className={cedulaInvalida ? "border-destructive" : ""}
                    onChange={(e) => set("cedula", e.target.value.replace(/\D/g, ""))}
                  />
                </Field>
                <Field
                  label="Cargo"
                  hint={
                    cargoSeleccionado?.estructuraOcupacional
                      ? `Estructura automática: ${cargoSeleccionado.estructuraOcupacional} · ${getEstructuraOcupacional(cargoSeleccionado.estructuraOcupacional).nombre}`
                      : "El cargo seleccionado aún no tiene estructura ocupacional"
                  }
                >
                  <Select value={form.cargoId} required onChange={(e) => cambiarClasificador("cargoId", Number(e.target.value))}>
                    <option value={0} disabled>
                      Seleccione un cargo
                    </option>
                    {cargos.map((cargo) => (
                      <option key={cargo.id} value={cargo.id} disabled={!cargo.activo && cargo.id !== form.cargoId}>
                        {cargo.estructuraOcupacional ?? "—"} · {cargo.nombre}{cargo.activo ? "" : " (inactivo)"}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Nombres">
                  <Input value={form.nombres} required onChange={(e) => set("nombres", e.target.value)} />
                </Field>
                <Field label="Apellidos">
                  <Input value={form.apellidos} required onChange={(e) => set("apellidos", e.target.value)} />
                </Field>
                <Field label="Régimen laboral">
                  <Select value={form.regimenId} onChange={(e) => cambiarClasificador("regimenId", Number(e.target.value))}>
                    {regimenes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nombre}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Región (para décimo cuarto)">
                  <Select value={form.region} onChange={(e) => set("region", e.target.value as EmpleadoForm["region"])}>
                    {Object.entries(REGIONES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field
                  label="Sueldo base mensual (USD)"
                  hint={
                    minimoSeleccionado?.tipoValor === "MENSUAL"
                      ? minimoSeleccionado.regla === "REFERENCIA" && minimoSeleccionado.minimoCent === 0
                        ? `${minimoSeleccionado.denominacion}: valor pendiente de configurar en Parámetros → Catálogo salarial`
                        : `${REGLAS[minimoSeleccionado.regla]}: ${formatUSD(minimoSeleccionado.minimoCent)} · ${minimoSeleccionado.denominacion} (${minimoSeleccionado.escalaEstado.toLowerCase()})`
                      : "Este cargo no tiene una regla salarial mensual vinculada para la fecha y el régimen"
                  }
                >
                  <Input
                    value={form.sueldo}
                    required
                    inputMode="decimal"
                    placeholder="0.00"
                    className="tabular text-right"
                    onChange={(e) => set("sueldo", e.target.value)}
                    min={
                      minimoSeleccionado?.tipoValor === "MENSUAL" && ["MINIMO", "FIJO"].includes(minimoSeleccionado.regla)
                        ? minimoSeleccionado.minimoCent / 100
                        : undefined
                    }
                    max={
                      minimoSeleccionado?.tipoValor === "MENSUAL" && ["TECHO", "FIJO"].includes(minimoSeleccionado.regla)
                        ? minimoSeleccionado.minimoCent / 100
                        : undefined
                    }
                    step="0.01"
                  />
                </Field>
                <Field label="Fecha de ingreso">
                  <Input type="date" value={form.fechaIngreso} required onChange={(e) => cambiarFechaIngreso(e.target.value)} />
                </Field>
                <Field
                  label="Sueldo vigente desde"
                  hint={form.id ? "Solo crea una versión si cambia el sueldo" : "En el alta debe coincidir con la fecha de ingreso"}
                >
                  <Input
                    type="date"
                    value={form.sueldoVigenteDesde}
                    required
                    onChange={(e) => cambiarVigenciaSueldo(e.target.value)}
                  />
                </Field>
                <Field label="Motivo del sueldo">
                  <Input value={form.motivoCambioSueldo} onChange={(e) => set("motivoCambioSueldo", e.target.value)} />
                </Field>
              </div>
              <div className="space-y-4 rounded-md border bg-muted/40 p-4">
                <div>
                  <p className="text-sm font-semibold">Modalidades de pago</p>
                  <p className="mt-1 text-xs text-muted-foreground">Elija cómo recibe cada beneficio. Los acumulados no se suman al neto mensual.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Décimo tercero">
                    <Select value={form.mensualiza13 ? "MENSUAL" : "ACUMULADO"} onChange={e => set("mensualiza13", e.target.value === "MENSUAL")}>
                      <option value="MENSUAL">Mensualizado</option><option value="ACUMULADO">Acumulado</option>
                    </Select>
                  </Field>
                  <Field label="Décimo cuarto">
                    <Select value={form.mensualiza14 ? "MENSUAL" : "ACUMULADO"} onChange={e => set("mensualiza14", e.target.value === "MENSUAL")}>
                      <option value="MENSUAL">Mensualizado</option><option value="ACUMULADO">Acumulado</option>
                    </Select>
                  </Field>
                  <Field label="Fondos de reserva" hint="El derecho se calcula desde el segundo año de servicio.">
                    <Select value={form.fondosReservaModalidad} onChange={e => { set("fondosReservaModalidad", e.target.value as "DIRECTO" | "IESS"); set("aplicaFondosReserva", true); }}>
                      <option value="DIRECTO">Pago directo al empleado</option><option value="IESS">Depósito al IESS</option>
                    </Select>
                  </Field>
                  <Field label="Condiciones vigentes desde" hint="Régimen, región y modalidades. Conserve la solicitud del empleado.">
                    <Input type="date" required min={form.fechaIngreso} max={hoy} value={form.condicionesVigenteDesde} disabled={!form.id} onChange={e => set("condicionesVigenteDesde", e.target.value)} />
                  </Field>
                </div>
                <Link href="/parametros/guia-nomina" className="text-xs font-medium text-primary underline">Consultar la guía de nómina y beneficios</Link>
              </div>
              {error && <Alert tone="danger">{error}</Alert>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setForm(null)}>
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

      <Dialog open={historialEmpleadoId !== null} onOpenChange={(abierto) => !abierto && setHistorialEmpleadoId(null)}>
        <DialogContent title="Historial salarial" description="Versiones conservadas por fecha de vigencia.">
          <Table>
            <THead>
              <TR>
                <TH numeric>Sueldo</TH>
                <TH>Desde</TH>
                <TH>Hasta</TH>
                <TH>Motivo</TH>
              </TR>
            </THead>
            <TBody>
              {historialSeleccionado.map((item) => (
                <TR key={item.id}>
                  <TD numeric className="font-medium">{formatUSD(item.sueldoCent)}</TD>
                  <TD className="tabular whitespace-nowrap">{fechaCorta(item.vigenteDesde)}</TD>
                  <TD className="tabular whitespace-nowrap">{item.vigenteHasta ? fechaCorta(item.vigenteHasta) : <Badge tone="success">Vigente</Badge>}</TD>
                  <TD className="text-muted-foreground">{item.motivo || "—"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </DialogContent>
      </Dialog>
    </>
  );
}
