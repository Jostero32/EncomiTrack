import { getDb } from "@/lib/db";
import { hoyISO } from "@/lib/periodo";
import { listCargos, listEmpleados, listHistorialSueldos, listReferenciasSalarialesCargo, listRegimenes } from "@/lib/repo";
import { EmpleadosClient } from "./empleados-client";

export const dynamic = "force-dynamic";

export default function EmpleadosPage() {
  const db = getDb();
  return (
    <EmpleadosClient
      empleados={listEmpleados(db)}
      regimenes={listRegimenes(db)}
      cargos={listCargos(db)}
      referencias={listReferenciasSalarialesCargo(db)}
      historialSueldos={listHistorialSueldos(db)}
      hoy={hoyISO()}
    />
  );
}
