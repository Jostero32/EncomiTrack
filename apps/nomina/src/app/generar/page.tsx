import { getDb } from "@/lib/db";
import { listRegimenes } from "@/lib/repo";
import { isPeriodo, periodoActual } from "@/lib/periodo";
import { GenerarClient } from "./generar-client";

export const dynamic = "force-dynamic";

export default async function GenerarPage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const sp = await searchParams;
  const actual = periodoActual();
  const periodo = sp.periodo && isPeriodo(sp.periodo) ? sp.periodo : actual;
  return <GenerarClient regimenes={listRegimenes(getDb())} periodoInicial={periodo} periodoMax={actual} />;
}
