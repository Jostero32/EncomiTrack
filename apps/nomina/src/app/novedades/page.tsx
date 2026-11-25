import { getDb } from "@/lib/db";
import { centsToInput } from "@/lib/money";
import { isPeriodo, periodoActual } from "@/lib/periodo";
import { fechaVigencia, listEmpleados, listNovedades, listRegimenes, parametrosVigentes } from "@/lib/repo";
import { NovedadesClient, type FilaNovedad } from "./novedades-client";
import { resolverDescuentos } from "@/lib/payroll/descuentos";

export const dynamic = "force-dynamic";

export default async function NovedadesPage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const sp = await searchParams;
  const periodo = sp.periodo && isPeriodo(sp.periodo) ? sp.periodo : periodoActual();
  const db = getDb();
  const novedades = listNovedades(db, periodo);
  const limites: Record<number, { mes: string; dia: string }> = {};
  for (const r of listRegimenes(db)) {
    const p = parametrosVigentes(db, r.id, fechaVigencia(periodo));
    limites[r.id] = { mes: p.limite_suplementarias_mes ?? "", dia: p.limite_suplementarias_dia ?? "" };
  }
  const filas: FilaNovedad[] = listEmpleados(db, { soloActivos: true }).map((e) => {
    const n = novedades.get(e.id);
    return {
      empleadoId: e.id,
      nombre: `${e.apellidos} ${e.nombres}`,
      cedula: e.cedula,
      regimenId: e.regimenId,
      regimenCodigo: e.regimenCodigo,
      horasNocturnas: n ? String(n.horasNocturnas) : "0",
      horasSuplementarias: n ? String(n.horasSuplementarias) : "0",
      horasExtraordinarias: n ? String(n.horasExtraordinarias) : "0",
      otrosIngresos: n ? centsToInput(n.otrosIngresosCent) : "0.00",
      descuentos: n ? centsToInput(n.descuentosCent) : "0.00",
      descuentosDetalle: resolverDescuentos(n?.descuentosCent ?? 0, n?.descuentosDetalle).map(d => ({ concepto: d.concepto, importe: centsToInput(d.valorCent) })),
      impuestoRenta: centsToInput(n?.impuestoRentaCent ?? 0),
      pagoDecimoTercero: centsToInput(n?.pagoDecimoTerceroCent ?? 0),
      pagoDecimoCuarto: centsToInput(n?.pagoDecimoCuartoCent ?? 0),
      observacion: n?.observacion ?? "",
    };
  });
  return <NovedadesClient key={periodo} periodo={periodo} filasIniciales={filas} limites={limites} />;
}
