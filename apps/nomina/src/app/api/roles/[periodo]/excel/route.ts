import { getDb } from "@/lib/db";
import { excelConsolidado } from "@/lib/export/excel";
import { isPeriodo } from "@/lib/periodo";
import { rolesDelPeriodo } from "@/lib/payroll/service";
import { empresaParaDocumentos } from "@/lib/empresa-logo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ periodo: string }> }) {
  const { periodo } = await params;
  if (!isPeriodo(periodo)) return new Response("Periodo inválido", { status: 400 });
  const db = getDb();
  const roles = rolesDelPeriodo(db, periodo);
  if (!roles.length) return new Response("No hay roles generados para este periodo", { status: 404 });
  const buf = await excelConsolidado(periodo, roles, await empresaParaDocumentos(db));
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="rol-consolidado-${periodo}.xlsx"`,
    },
  });
}
