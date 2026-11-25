import Link from "next/link";
import { Calculator, ClipboardList, PiggyBank, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, PageHeader } from "@/components/ui/card";
import { EmptyRow } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { getDb } from "@/lib/db";
import { formatUSD } from "@/lib/money";
import { SECCIONES } from "@/lib/navegacion";
import { nombrePeriodo, periodoActual } from "@/lib/periodo";
import { listEmpleados, listRegimenes } from "@/lib/repo";
import { resumenPeriodos } from "@/lib/payroll/service";

export const dynamic = "force-dynamic";

export default function PanelPage() {
  const db = getDb();
  const empleados = listEmpleados(db, { soloActivos: true });
  const periodos = resumenPeriodos(db);
  const ultimo = periodos[0];
  const porRegimen = listRegimenes(db).map((regimen) => ({
    codigo: regimen.codigo,
    n: empleados.filter((empleado) => empleado.regimenId === regimen.id).length,
  }));

  return (
    <>
      <PageHeader
        icon={SECCIONES.panel.icon}
        title="Panel"
        description={`Resumen de la nómina · periodo en curso: ${nombrePeriodo(periodoActual())}`}
        actions={
          <Button asChild>
            <Link href="/generar">
              <Calculator /> Generar rol
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Empleados activos"
          value={String(empleados.length)}
          hint={porRegimen.map((r) => `${r.codigo}: ${r.n}`).join(" · ")}
        />
        <StatCard
          icon={Wallet}
          label="Nómina neta último periodo"
          value={ultimo ? formatUSD(ultimo.netoCent) : "—"}
          hint={ultimo ? nombrePeriodo(ultimo.periodo) : "Sin roles generados"}
        />
        <StatCard
          icon={ClipboardList}
          tone="gold"
          label="Total ingresos último periodo"
          value={ultimo ? formatUSD(ultimo.ingresosCent) : "—"}
          hint={ultimo ? `${ultimo.empleados} roles` : undefined}
        />
        <StatCard
          icon={PiggyBank}
          tone="accent"
          label="Provisiones último periodo"
          value={ultimo ? formatUSD(ultimo.provisionesCent) : "—"}
          hint="Aporte patronal y décimos acumulados"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Últimos periodos generados</CardTitle>
          </CardHeader>
          <Table>
            <THead>
              <TR>
                <TH>Periodo</TH>
                <TH numeric>Empleados</TH>
                <TH numeric>Ingresos</TH>
                <TH numeric>Neto</TH>
                <TH numeric>Provisiones</TH>
              </TR>
            </THead>
            <TBody>
              {periodos.slice(0, 6).map((p) => (
                <TR key={p.periodo}>
                  <TD>
                    <Link href={`/historial/${p.periodo}`} className="font-medium text-primary hover:underline">
                      {nombrePeriodo(p.periodo)}
                    </Link>
                  </TD>
                  <TD numeric>{p.empleados}</TD>
                  <TD numeric>{formatUSD(p.ingresosCent)}</TD>
                  <TD numeric className="font-semibold">
                    {formatUSD(p.netoCent)}
                  </TD>
                  <TD numeric>{formatUSD(p.provisionesCent)}</TD>
                </TR>
              ))}
              {periodos.length === 0 && <EmptyRow colSpan={5}>Aún no hay roles generados.</EmptyRow>}
            </TBody>
          </Table>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Flujo mensual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              ["1", "Revise los parámetros vigentes", "/parametros"],
              ["2", "Registre las novedades del mes", "/novedades"],
              ["3", "Calcule y guarde el rol", "/generar"],
              ["4", "Imprima o exporte desde el historial", "/historial"],
            ].map(([n, t, href]) => (
              <Link key={n} href={href} className="flex items-center gap-3 rounded-md p-2 hover:bg-muted">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                  {n}
                </span>
                {t}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
