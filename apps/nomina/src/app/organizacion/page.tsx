import type { CSSProperties } from "react";
import Link from "next/link";
import { Building2, CircleUserRound, Layers, Network, UsersRound } from "lucide-react";
import { Alert, Badge, Card, PageHeader } from "@/components/ui/card";
import { SegmentedNav } from "@/components/ui/segmented-nav";
import { getDb } from "@/lib/db";
import { construirJerarquia } from "@/lib/jerarquia";
import { SECCIONES } from "@/lib/navegacion";
import {
  ESTRUCTURAS_OCUPACIONALES,
  getEstructuraOcupacional,
  NIVELES_OCUPACIONALES,
} from "@/lib/estructura-ocupacional";
import { listCargos, listEmpleados, nombreVisibleEmpresa, obtenerEmpresa, type Empleado } from "@/lib/repo";
import { COLORES_NIVEL, iniciales } from "./comun";
import { OrganigramaJerarquia } from "./organigrama-jerarquia";

export const dynamic = "force-dynamic";

function Persona({ empleado }: { empleado: Empleado }) {
  return (
    <div className={`org-person ${empleado.activo ? "" : "org-person-inactive"}`}>
      <span className="org-avatar" aria-hidden="true">
        {iniciales(empleado)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold">
          {empleado.nombres} {empleado.apellidos}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{empleado.cargo}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <Badge tone={empleado.regimenCodigo === "CT" ? "primary" : "neutral"}>{empleado.regimenCodigo}</Badge>
        <span className={`size-1.5 rounded-full ${empleado.activo ? "bg-success" : "bg-muted-foreground"}`} />
      </span>
    </div>
  );
}

export default async function OrganizacionPage({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  const vista = (await searchParams).vista === "nivel" ? "nivel" : "jerarquia";
  const db = getDb();
  const empleados = listEmpleados(db);
  const raices = vista === "jerarquia" ? construirJerarquia(listCargos(db), empleados) : [];
  const activos = empleados.filter((empleado) => empleado.activo).length;
  const sinClasificar = empleados.filter((empleado) => !empleado.estructuraOcupacional);
  const empresa = nombreVisibleEmpresa(obtenerEmpresa(db));

  return (
    <>
      <PageHeader
        icon={SECCIONES.organizacion.icon}
        title="Mapa organizacional"
        description={
          vista === "jerarquia"
            ? "Quién reporta a quién, según el campo «Reporta a» de cada cargo."
            : "Organigrama del personal según la estructura ocupacional sectorial."
        }
        actions={
          <div className="flex gap-2">
            <Badge tone="success" className="px-2.5 py-1">
              {activos} activos
            </Badge>
            <Badge className="px-2.5 py-1">{empleados.length} personas</Badge>
          </div>
        }
      />

      <SegmentedNav
        label="Vistas del organigrama"
        items={[
          { href: "/organizacion", label: "Por jerarquía", icon: Network, activo: vista === "jerarquia" },
          { href: "/organizacion?vista=nivel", label: "Por nivel ocupacional", icon: Layers, activo: vista === "nivel" },
        ]}
      />

      {vista === "jerarquia" ? (
        <>
          {raices.length > 1 && (
            <div className="mb-4">
              <Alert tone="info" title={`${raices.length} cargos sin superior`}>
                Asigne el campo «Reporta a» en{" "}
                <Link href="/cargos" className="font-semibold underline">
                  Cargos
                </Link>{" "}
                para unirlos en un solo árbol. Los puestos sin personas ni subordinados no se muestran.
              </Alert>
            </div>
          )}
          {raices.length > 0 ? (
            <OrganigramaJerarquia raices={raices} />
          ) : (
            <Alert tone="info">Aún no hay cargos con personal activo.</Alert>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Los puestos vacantes aparecen como «Por definir» solo si tienen subordinados. Desplácese horizontalmente en pantallas pequeñas.
          </p>
        </>
      ) : (
        <>
      <div className="org-map-viewport" role="region" aria-label="Organigrama por estructura ocupacional" tabIndex={0}>
        <div className="org-map">
          <div className="org-root">
            <span className="org-root-icon">
              <Building2 className="size-6" />
            </span>
            <span>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/70">Organización</span>
              <span className="mt-0.5 block text-base font-bold text-foreground">{empresa}</span>
              <span className="mt-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <UsersRound className="size-3.5" /> {empleados.length} personas registradas
              </span>
            </span>
          </div>

          {NIVELES_OCUPACIONALES.map((nivel) => {
            const estructuras = ESTRUCTURAS_OCUPACIONALES.filter((item) => item.nivel === nivel.nivel);
            const totalNivel = empleados.filter(
              (empleado) =>
                empleado.estructuraOcupacional &&
                getEstructuraOcupacional(empleado.estructuraOcupacional).nivel === nivel.nivel,
            ).length;
            const style = {
              "--org-columns": estructuras.length,
              "--org-accent": COLORES_NIVEL[nivel.nivel],
            } as CSSProperties;

            return (
              <section key={nivel.nivel} className="org-stage" style={style} aria-labelledby={`nivel-${nivel.nivel}`}>
                <div className="org-level-node">
                  <span className="org-level-letter">{nivel.nivel}</span>
                  <span className="text-left">
                    <span id={`nivel-${nivel.nivel}`} className="block text-sm font-bold">
                      {nivel.nombre}
                    </span>
                    <span className="block text-[11px] opacity-75">{nivel.descripcion}</span>
                  </span>
                  <span className="org-level-count">{totalNivel}</span>
                </div>

                <div className="org-branches">
                  {estructuras.map((estructura) => {
                    const personas = empleados.filter((empleado) => empleado.estructuraOcupacional === estructura.codigo);
                    return (
                      <article key={estructura.codigo} className="org-role-node">
                        <header className="org-role-header">
                          <span className="org-code">{estructura.codigo}</span>
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-bold text-foreground">{estructura.nombre}</span>
                            <span className="block text-[11px] text-muted-foreground">
                              {personas.length} {personas.length === 1 ? "persona" : "personas"}
                            </span>
                          </span>
                        </header>
                        <div className="space-y-2">
                          {personas.map((empleado) => (
                            <Persona key={empleado.id} empleado={empleado} />
                          ))}
                          {personas.length === 0 && (
                            <div className="org-empty-person">
                              <CircleUserRound className="size-4" /> Sin personal asignado
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>Desplácese horizontalmente para recorrer el organigrama en pantallas pequeñas.</span>
        <span>● Activo &nbsp; ● Inactivo</span>
      </div>

        </>
      )}

      {sinClasificar.length > 0 && (
        <Card className="mt-6 border-warning/30">
          <div className="border-b bg-warning-soft px-5 py-3">
            <h2 className="text-sm font-semibold text-warning">Pendientes de ubicar en el mapa</h2>
            <p className="mt-0.5 text-xs text-warning">
              Edite sus cargos y asigne la estructura ocupacional correspondiente para incorporarlos al organigrama.
            </p>
          </div>
          <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sinClasificar.map((empleado) => (
              <Persona key={empleado.id} empleado={empleado} />
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
