import { getDb } from "@/lib/db";
import { pdfRolIndividual } from "@/lib/export/pdf";
import { isPeriodo } from "@/lib/periodo";
import { rolDeEmpleado } from "@/lib/payroll/service";
import { empresaParaDocumentos } from "@/lib/empresa-logo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ periodo: string; id: string }> }) {
  const { periodo, id } = await params;
  if (!isPeriodo(periodo)) return new Response("Periodo inválido", { status: 400 });
  const db = getDb();
  const rol = rolDeEmpleado(db, periodo, Number(id));
  if (!rol) return new Response("Rol no encontrado", { status: 404 });
  const buf = await pdfRolIndividual(rol, await empresaParaDocumentos(db));
  const nombre = `${rol.empleado.apellidos}`.normalize("NFD").replace(/[^\w]+/g, "-").toLowerCase();
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="rol-${periodo}-${nombre}.pdf"`,
    },
  });
}
