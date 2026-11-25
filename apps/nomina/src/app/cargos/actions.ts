"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { esEstructuraOcupacional, type EstructuraOcupacional } from "@/lib/estructura-ocupacional";
import {
  actualizarCargo,
  crearCargo,
  listOpcionesEscalaCargo,
  listRegimenes,
  setCargoActivo,
  type CargoInput,
} from "@/lib/repo";

export interface CargoForm {
  id?: number;
  nombre: string;
  estructuraOcupacional: EstructuraOcupacional | "";
  descripcion: string;
  asignacionesSalariales: Record<string, string>;
  /** 0 = sin superior (cabeza del organigrama). */
  reportaAId: number;
}

export type CargoActionResult = { ok: true } | { ok: false; error: string };

function revalidarCargos() {
  revalidatePath("/cargos");
  revalidatePath("/empleados");
  revalidatePath("/organizacion");
  revalidatePath("/parametros/escalas");
  revalidatePath("/");
}

export async function guardarCargo(form: CargoForm): Promise<CargoActionResult> {
  try {
    const nombre = form.nombre.trim();
    if (!nombre) return { ok: false, error: "El nombre del cargo es obligatorio" };
    if (!esEstructuraOcupacional(form.estructuraOcupacional)) {
      return { ok: false, error: "Seleccione una estructura ocupacional válida" };
    }
    const db = getDb();
    const asignacionesSalariales = Object.entries(form.asignacionesSalariales)
      .filter(([, codigoReferencia]) => codigoReferencia.trim())
      .map(([regimenId, codigoReferencia]) => ({ regimenId: Number(regimenId), codigoReferencia: codigoReferencia.trim() }));
    const regimenCt = listRegimenes(db).find((regimen) => regimen.codigo === "CT");
    const asignacionCt = asignacionesSalariales.find((asignacion) => asignacion.regimenId === regimenCt?.id);
    const detalleCt = asignacionCt
      ? listOpcionesEscalaCargo(db).find(
          (detalle) => detalle.regimenId === asignacionCt.regimenId && detalle.codigoReferencia === asignacionCt.codigoReferencia,
        )
      : undefined;
    const data: CargoInput = {
      nombre,
      estructuraOcupacional: detalleCt?.estructuraOcupacional ?? form.estructuraOcupacional,
      descripcion: form.descripcion.trim(),
      asignacionesSalariales,
      reportaAId: form.reportaAId || null,
    };
    if (form.id) actualizarCargo(db, form.id, data);
    else crearCargo(db, data);
    revalidarCargos();
    return { ok: true };
  } catch (error) {
    const mensaje = (error as Error).message;
    if (mensaje.includes("UNIQUE")) return { ok: false, error: "Ya existe un cargo con ese nombre" };
    return { ok: false, error: mensaje };
  }
}

export async function cambiarEstadoCargo(id: number, activo: boolean): Promise<CargoActionResult> {
  try {
    setCargoActivo(getDb(), id, activo);
    revalidarCargos();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}
