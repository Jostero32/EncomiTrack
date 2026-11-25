import { getDb } from "@/lib/db";
import { listRegimenes, listTodosParametros } from "@/lib/repo";
import { periodoActual } from "@/lib/periodo";
import { ParametrosClient } from "./parametros-client";

export const dynamic = "force-dynamic";

export default function ParametrosPage() {
  const db = getDb();
  return <ParametrosClient parametros={listTodosParametros(db)} regimenes={listRegimenes(db)} periodoDefault={periodoActual()} />;
}
