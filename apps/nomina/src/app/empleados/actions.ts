"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { validarCedula } from "@/lib/cedula";
import { parseMoneyToCents } from "@/lib/money";
import { hoyISO } from "@/lib/periodo";
import { actualizarEmpleado, crearEmpleado, setEmpleadoActivo, type EmpleadoInput, type Region } from "@/lib/repo";

export interface EmpleadoForm {
  id?: number;
  cedula: string;
  nombres: string;
  apellidos: string;
  cargoId: number;
  regimenId: number;
  sueldo: string;
  sueldoVigenteDesde: string;
  motivoCambioSueldo: string;
  fechaIngreso: string;
  region: Region;
  mensualiza13: boolean;
  mensualiza14: boolean;
  aplicaFondosReserva: boolean;
  fondosReservaModalidad: "DIRECTO" | "IESS";
  condicionesVigenteDesde: string;
}

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function guardarEmpleado(form: EmpleadoForm): Promise<ActionResult> {
  try {
    const cedula = form.cedula.trim();
    if (!validarCedula(cedula)) return { ok: false, error: "La cédula no es válida (verificación módulo 10)" };
    if (!form.nombres.trim() || !form.apellidos.trim()) return { ok: false, error: "Nombres y apellidos son obligatorios" };
    if (!Number.isInteger(Number(form.cargoId)) || Number(form.cargoId) <= 0) {
      return { ok: false, error: "Seleccione un cargo válido" };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.fechaIngreso)) return { ok: false, error: "Fecha de ingreso inválida" };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.sueldoVigenteDesde)) {
      return { ok: false, error: "Fecha de vigencia del sueldo inválida" };
    }
    if (!form.id && form.sueldoVigenteDesde !== form.fechaIngreso) {
      return { ok: false, error: "El sueldo inicial debe regir desde la fecha de ingreso" };
    }
    if (!["DIRECTO", "IESS"].includes(form.fondosReservaModalidad)) return { ok: false, error: "Modalidad de fondos de reserva inválida" };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.condicionesVigenteDesde) || form.condicionesVigenteDesde < form.fechaIngreso || (form.id && form.condicionesVigenteDesde > hoyISO())) {
      return { ok: false, error: "La vigencia de las condiciones debe estar entre el ingreso y la fecha actual" };
    }
    if (form.id && form.sueldoVigenteDesde > hoyISO()) {
      return { ok: false, error: "El cambio salarial no puede registrarse con una fecha futura" };
    }
    let sueldoBaseCent: number;
    try {
      sueldoBaseCent = parseMoneyToCents(form.sueldo);
    } catch {
      return { ok: false, error: "Sueldo inválido" };
    }
    if (sueldoBaseCent <= 0) return { ok: false, error: "El sueldo debe ser mayor a cero" };

    const data: EmpleadoInput = {
      cedula,
      nombres: form.nombres.trim(),
      apellidos: form.apellidos.trim(),
      cargoId: Number(form.cargoId),
      regimenId: Number(form.regimenId),
      sueldoBaseCent,
      fechaIngreso: form.fechaIngreso,
      region: form.region,
      mensualiza13: form.mensualiza13,
      mensualiza14: form.mensualiza14,
      aplicaFondosReserva: form.aplicaFondosReserva,
      fondosReservaModalidad: form.fondosReservaModalidad,
      condicionesVigenteDesde: form.id ? form.condicionesVigenteDesde : form.fechaIngreso,
      sueldoVigenteDesde: form.sueldoVigenteDesde,
      motivoCambioSueldo: form.motivoCambioSueldo,
    };
    const db = getDb();
    if (form.id) actualizarEmpleado(db, form.id, data);
    else crearEmpleado(db, data);
    revalidatePath("/empleados");
    revalidatePath("/generar");
    revalidatePath("/organizacion");
    revalidatePath("/parametros/escalas");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes("UNIQUE")) return { ok: false, error: "Ya existe un empleado con esa cédula" };
    return { ok: false, error: msg };
  }
}

export async function cambiarEstadoEmpleado(id: number, activo: boolean): Promise<ActionResult> {
  setEmpleadoActivo(getDb(), id, activo);
  revalidatePath("/empleados");
  revalidatePath("/organizacion");
  revalidatePath("/parametros/escalas");
  revalidatePath("/");
  return { ok: true };
}
