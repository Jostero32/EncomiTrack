import { getDb } from "@/lib/db";
import { listCargos, listOpcionesEscalaCargo, listRegimenes } from "@/lib/repo";
import { CargosClient } from "./cargos-client";

export const dynamic = "force-dynamic";

export default function CargosPage() {
  const db = getDb();
  return <CargosClient cargos={listCargos(db)} regimenes={listRegimenes(db)} opcionesEscala={listOpcionesEscalaCargo(db)} />;
}
