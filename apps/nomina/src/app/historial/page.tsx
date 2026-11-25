import Link from "next/link";
import { FileDown, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/card";
import { EmptyRow } from "@/components/ui/empty-state";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { conBase } from "@/lib/base-path";
import { getDb } from "@/lib/db";
import { formatUSD } from "@/lib/money";
import { SECCIONES } from "@/lib/navegacion";
import { nombrePeriodo } from "@/lib/periodo";
import { resumenPeriodos } from "@/lib/payroll/service";

export const dynamic = "force-dynamic";

export default function HistorialPage() {
  const periodos = resumenPeriodos(getDb());
  return (
    <>
      <PageHeader icon={SECCIONES.historial.icon} title="Historial" description="Roles de pago generados por periodo." />
      <Card>
        <Table>
          <THead>
            <TR>
              <TH>Periodo</TH>
              <TH numeric>Empleados</TH>
              <TH numeric>Ingresos</TH>
              <TH numeric>Egresos</TH>
              <TH numeric>Neto pagado</TH>
              <TH numeric>Provisiones</TH>
              <TH>Generado</TH>
              <TH className="text-right">Acciones</TH>
            </TR>
          </THead>
          <TBody>
            {periodos.map((p) => (
              <TR key={p.periodo}>
                <TD>
                  <Link href={`/historial/${p.periodo}`} className="font-medium text-primary hover:underline">
                    {nombrePeriodo(p.periodo)}
                  </Link>
                </TD>
                <TD numeric>{p.empleados}</TD>
                <TD numeric>{formatUSD(p.ingresosCent)}</TD>
                <TD numeric>{formatUSD(p.egresosCent)}</TD>
                <TD numeric className="font-semibold">
                  {formatUSD(p.netoCent)}
                </TD>
                <TD numeric>{formatUSD(p.provisionesCent)}</TD>
                <TD className="text-xs text-muted-foreground">{new Date(p.generadoEn).toLocaleString("es-EC")}</TD>
                <TD className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button asChild variant="ghost" size="icon" title="Excel">
                      <a href={conBase(`/api/roles/${p.periodo}/excel`)}>
                        <FileDown />
                      </a>
                    </Button>
                    <Button asChild variant="ghost" size="icon" title="PDF consolidado">
                      <a href={conBase(`/api/roles/${p.periodo}/pdf`)} target="_blank" rel="noreferrer">
                        <Printer />
                      </a>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/historial/${p.periodo}`}>Ver roles</Link>
                    </Button>
                  </div>
                </TD>
              </TR>
            ))}
            {periodos.length === 0 && (
              <EmptyRow colSpan={8}>
                Aún no se han generado roles. <Link href="/generar" className="text-primary underline">Generar rol</Link>
              </EmptyRow>
            )}
          </TBody>
        </Table>
      </Card>
    </>
  );
}
