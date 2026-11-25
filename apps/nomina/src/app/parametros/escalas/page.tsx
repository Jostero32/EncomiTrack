import { EscalasClient } from "@/app/escalas/escalas-client";
import { getDb } from "@/lib/db";
import { hoyISO } from "@/lib/periodo";
import {
  listDetallesEscala,
  listEscalasSalariales,
  listIncumplimientosSalariales,
  listRegimenes,
} from "@/lib/repo";

export const dynamic = "force-dynamic";

export default function CatalogoSalarialPage() {
  const db = getDb();
  const hoy = hoyISO();
  return (
    <EscalasClient
      escalas={listEscalasSalariales(db)}
      detalles={listDetallesEscala(db)}
      regimenes={listRegimenes(db)}
      incumplimientos={listIncumplimientosSalariales(db, hoy)}
      hoy={hoy}
    />
  );
}
