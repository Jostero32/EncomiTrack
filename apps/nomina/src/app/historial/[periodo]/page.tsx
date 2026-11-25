import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/card";
import { BotonesDescarga, RolConsolidado } from "@/components/rol-views";
import { getDb } from "@/lib/db";
import { SECCIONES } from "@/lib/navegacion";
import { isPeriodo, nombrePeriodo } from "@/lib/periodo";
import { rolesDelPeriodo } from "@/lib/payroll/service";

export const dynamic = "force-dynamic";

export default async function HistorialPeriodoPage({ params }: { params: Promise<{ periodo: string }> }) {
  const { periodo } = await params;
  if (!isPeriodo(periodo)) notFound();
  const roles = rolesDelPeriodo(getDb(), periodo);
  if (!roles.length) notFound();
  const filas = roles.map(({ empleado, resultado }) => ({ empleado, resultado }));
  return (
    <>
      <PageHeader
        eyebrow="Historial"
        icon={SECCIONES.historial.icon}
        title={`Roles de ${nombrePeriodo(periodo)}`}
        description={`Generado el ${new Date(roles[0].generadoEn).toLocaleString("es-EC")} · valores guardados (no cambian al editar parámetros).`}
        actions={
          <>
            <Button asChild variant="ghost">
              <Link href="/historial">
                <ArrowLeft /> Volver
              </Link>
            </Button>
            <BotonesDescarga periodo={periodo} />
          </>
        }
      />
      <Card>
        <RolConsolidado filas={filas} guardado />
      </Card>
    </>
  );
}
