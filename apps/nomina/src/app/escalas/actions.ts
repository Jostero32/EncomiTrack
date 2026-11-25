"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { esEstructuraOcupacional, type EstructuraOcupacional } from "@/lib/estructura-ocupacional";
import { parseMoneyToCents } from "@/lib/money";
import {
  actualizarEscalaSalarial,
  crearEscalaSalarial,
  guardarDetalleEscala,
  type EstadoEscala,
  type ReglaValorEscala,
  type TipoValorEscala,
} from "@/lib/repo";

export type EscalaActionResult = { ok: true } | { ok: false; error: string };

export interface EscalaForm {
  id?: number;
  regimenId: number;
  nombre: string;
  anio: number;
  vigenteDesde: string;
  vigenteHasta: string;
  estado: EstadoEscala;
  referenciaLegal: string;
  fuenteUrl: string;
  observacion: string;
}

export interface DetalleEscalaForm {
  id?: number;
  escalaId: number;
  codigoReferencia: string;
  denominacion: string;
  comision: string;
  rama: string;
  estructuraOcupacional: EstructuraOcupacional | "";
  minimo: string;
  tipoValor: TipoValorEscala;
  regla: ReglaValorEscala;
}

function revalidar() {
  revalidatePath("/escalas");
  revalidatePath("/parametros/escalas");
  revalidatePath("/cargos");
  revalidatePath("/empleados");
  revalidatePath("/generar");
}

export async function guardarEscala(form: EscalaForm): Promise<EscalaActionResult> {
  try {
    if (!Number.isInteger(Number(form.regimenId)) || Number(form.regimenId) <= 0) {
      return { ok: false, error: "Seleccione un régimen válido" };
    }
    if (!form.nombre.trim()) return { ok: false, error: "El nombre de la escala es obligatorio" };
    const anio = Number(form.anio);
    if (!Number.isInteger(anio) || anio < 2000 || anio > 2200) return { ok: false, error: "Año inválido" };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.vigenteDesde)) return { ok: false, error: "Vigencia inicial inválida" };
    if (form.vigenteHasta && !/^\d{4}-\d{2}-\d{2}$/.test(form.vigenteHasta)) {
      return { ok: false, error: "Vigencia final inválida" };
    }
    if (form.vigenteHasta && form.vigenteHasta < form.vigenteDesde) {
      return { ok: false, error: "La vigencia final no puede ser anterior a la inicial" };
    }
    const fuenteUrl = form.fuenteUrl.trim();
    if (fuenteUrl && !/^https?:\/\//i.test(fuenteUrl)) return { ok: false, error: "La fuente debe ser una URL http o https" };

    const data = {
      regimenId: Number(form.regimenId),
      nombre: form.nombre.trim(),
      anio,
      vigenteDesde: form.vigenteDesde,
      vigenteHasta: form.vigenteHasta || null,
      estado: form.estado,
      referenciaLegal: form.referenciaLegal.trim(),
      fuenteUrl,
      observacion: form.observacion.trim(),
    };
    const db = getDb();
    if (form.id) actualizarEscalaSalarial(db, form.id, data);
    else crearEscalaSalarial(db, data);
    revalidar();
    return { ok: true };
  } catch (error) {
    const mensaje = (error as Error).message;
    if (mensaje.includes("UNIQUE")) return { ok: false, error: "Ya existe esa escala para la misma fecha" };
    return { ok: false, error: mensaje };
  }
}

export async function guardarDetalle(form: DetalleEscalaForm): Promise<EscalaActionResult> {
  try {
    if (!Number.isInteger(Number(form.escalaId)) || Number(form.escalaId) <= 0) {
      return { ok: false, error: "Escala inválida" };
    }
    const codigoReferencia = form.codigoReferencia.trim().toUpperCase();
    if (!codigoReferencia) return { ok: false, error: "El código estable es obligatorio" };
    if (!form.denominacion.trim()) return { ok: false, error: "La denominación es obligatoria" };
    if (form.estructuraOcupacional && !esEstructuraOcupacional(form.estructuraOcupacional)) {
      return { ok: false, error: "Estructura ocupacional inválida" };
    }
    let minimoCent: number;
    try {
      minimoCent = parseMoneyToCents(form.minimo);
    } catch {
      return { ok: false, error: "Valor mínimo inválido" };
    }
    if (minimoCent < 0 || (minimoCent === 0 && form.regla !== "REFERENCIA")) {
      return { ok: false, error: "El valor debe ser mayor a cero; solo una referencia por configurar puede quedar en cero" };
    }

    guardarDetalleEscala(
      getDb(),
      {
        escalaId: Number(form.escalaId),
        codigoReferencia,
        denominacion: form.denominacion.trim(),
        comision: form.comision.trim(),
        rama: form.rama.trim(),
        estructuraOcupacional: form.estructuraOcupacional || null,
        minimoCent,
        tipoValor: form.tipoValor,
        regla: form.regla,
      },
      form.id,
    );
    revalidar();
    return { ok: true };
  } catch (error) {
    const mensaje = (error as Error).message;
    if (mensaje.includes("UNIQUE")) return { ok: false, error: "El código ya existe dentro de esta escala" };
    return { ok: false, error: mensaje };
  }
}
