/**
 * Orquestación del cálculo: lee empleados, novedades y parámetros vigentes
 * desde la base, invoca el motor puro y persiste los roles.
 */
import type Database from "better-sqlite3";
import {
  fechaVigencia,
  listEmpleados,
  listNovedades,
  listRegimenes,
  minimoSalarialCargo,
  parametrosVigentes,
  sueldoEmpleadoVigente,
  condicionesEmpleadoVigentes,
  type Empleado,
} from "../repo";
import { esPeriodoFuturo, finPeriodo, isPeriodo } from "../periodo";
import { calcularRol, CLAVES_MOTOR, diasTrabajados, valorConcepto, type ParametrosRol, type ResultadoRol } from "./engine";

type DB = Database.Database;

export interface EmpleadoSnapshot {
  id: number;
  cedula: string;
  nombres: string;
  apellidos: string;
  cargo: string;
  regimenCodigo: string;
  regimenNombre: string;
  region: string;
  fechaIngreso: string;
  sueldoBaseCent: number;
  mensualiza13: boolean;
  mensualiza14: boolean;
  fondosReservaModalidad?: "DIRECTO" | "IESS";
}

export interface FilaRol {
  empleado: EmpleadoSnapshot;
  resultado: ResultadoRol;
}

export interface CalculoPeriodo {
  periodo: string;
  filas: FilaRol[];
  errores: string[];
  advertencias: string[];
  rolesExistentes: number;
}

function snapshot(e: Empleado, regimenNombre: string): EmpleadoSnapshot {
  return {
    id: e.id,
    cedula: e.cedula,
    nombres: e.nombres,
    apellidos: e.apellidos,
    cargo: e.cargo,
    regimenCodigo: e.regimenCodigo,
    regimenNombre,
    region: e.region,
    fechaIngreso: e.fechaIngreso,
    sueldoBaseCent: e.sueldoBaseCent,
    mensualiza13: e.mensualiza13,
    mensualiza14: e.mensualiza14,
    fondosReservaModalidad: e.fondosReservaModalidad ?? "DIRECTO",
  };
}

export function validarPeriodo(periodo: string) {
  if (!isPeriodo(periodo)) throw new Error("Periodo inválido (formato AAAA-MM)");
  if (esPeriodoFuturo(periodo)) throw new Error("No se puede generar el rol de un periodo futuro");
}

/** Calcula (sin guardar) el rol de todos los empleados activos del periodo. */
export function calcularPeriodo(db: DB, periodo: string, regimenId?: number): CalculoPeriodo {
  validarPeriodo(periodo);
  const regimenes = new Map(listRegimenes(db).map((r) => [r.id, r]));
  const empleados = listEmpleados(db, { soloActivos: true }).map(e => condicionesEmpleadoVigentes(db, e, finPeriodo(periodo))).filter(
    (e) => diasTrabajados(e.fechaIngreso, periodo) > 0,
  ).filter(e => !regimenId || e.regimenId === regimenId);
  const novedades = listNovedades(db, periodo);
  const fecha = fechaVigencia(periodo);
  const fechaFin = finPeriodo(periodo);
  const paramCache = new Map<number, ParametrosRol>();

  const filas: FilaRol[] = [];
  const errores: string[] = [];
  const advertencias: string[] = [];

  for (const e of empleados) {
    try {
      const sueldoHistorico = sueldoEmpleadoVigente(db, e.id, fechaFin);
      const empleadoPeriodo = sueldoHistorico === null ? e : { ...e, sueldoBaseCent: sueldoHistorico };
      let params = paramCache.get(e.regimenId);
      if (!params) {
        const todos = parametrosVigentes(db, e.regimenId, fecha);
        params = Object.fromEntries(CLAVES_MOTOR.map((k) => [k, todos[k]])) as ParametrosRol;
        paramCache.set(e.regimenId, params);
      }
      const n = novedades.get(e.id) ?? null;
      const resultado = calcularRol(empleadoPeriodo, n, params, periodo);
      completarBeneficios(db, e.id, resultado);
      filas.push({ empleado: snapshot(empleadoPeriodo, regimenes.get(e.regimenId)?.nombre ?? e.regimenCodigo), resultado });
      for (const a of resultado.advertencias) advertencias.push(`${e.apellidos} ${e.nombres}: ${a}`);
      if (e.cargoId) {
        const minimo = minimoSalarialCargo(db, e.cargoId, e.regimenId, fechaFin);
        if (minimo?.tipoValor === "MENSUAL" && minimo.regla !== "REFERENCIA") {
          const sueldo = (empleadoPeriodo.sueldoBaseCent / 100).toFixed(2);
          const valor = (minimo.minimoCent / 100).toFixed(2);
          if (minimo.regla === "MINIMO" && empleadoPeriodo.sueldoBaseCent < minimo.minimoCent) {
            advertencias.push(`${e.apellidos} ${e.nombres}: sueldo ${sueldo} inferior al mínimo ${valor} (${minimo.denominacion})`);
          } else if (minimo.regla === "FIJO" && empleadoPeriodo.sueldoBaseCent !== minimo.minimoCent) {
            advertencias.push(`${e.apellidos} ${e.nombres}: sueldo ${sueldo} no coincide con la RMU ${valor} (${minimo.denominacion})`);
          } else if (minimo.regla === "TECHO" && empleadoPeriodo.sueldoBaseCent > minimo.minimoCent) {
            advertencias.push(`${e.apellidos} ${e.nombres}: sueldo ${sueldo} supera el techo ${valor} (${minimo.denominacion})`);
          }
        }
      }
    } catch (err) {
      errores.push(`${e.apellidos} ${e.nombres}: ${(err as Error).message}`);
    }
  }

  const ids = filas.map((f) => f.empleado.id);
  const rolesExistentes = ids.length
    ? (
        db
          .prepare(`SELECT COUNT(*) AS c FROM roles_pago WHERE periodo = ? AND empleado_id IN (${ids.map(() => "?").join(",")})`)
          .get(periodo, ...ids) as { c: number }
      ).c
    : 0;

  return { periodo, filas, errores, advertencias, rolesExistentes };
}

/** Calcula y guarda (reemplazando los roles existentes de esos empleados en el periodo). */
export function generarYGuardar(db: DB, periodo: string, regimenId?: number): CalculoPeriodo {
  return db.transaction(() => {
  const calculo = calcularPeriodo(db, periodo, regimenId);
  if (calculo.errores.length) {
    throw new Error("No se puede guardar: " + calculo.errores.join("; "));
  }
  for (const f of calculo.filas) {
    if (db.prepare("SELECT 1 FROM roles_pago WHERE empleado_id=? AND periodo>? LIMIT 1").get(f.empleado.id, periodo)) {
      throw new Error("Hay roles posteriores que dependen de los saldos registrados. Registre la corrección como un ajuste en el periodo actual para conservar el historial.");
    }
  }
  const delRol = db.prepare("DELETE FROM roles_pago WHERE empleado_id = ? AND periodo = ?");
  const delProv = db.prepare("DELETE FROM provisiones WHERE empleado_id = ? AND periodo = ?");
  const insRol = db.prepare(
    `INSERT INTO roles_pago (empleado_id, periodo, ingresos_cent, egresos_cent, neto_cent, detalle_json, generado_en)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const insProv = db.prepare(
    `INSERT INTO provisiones (empleado_id, periodo, decimo_tercero_cent, decimo_cuarto_cent, fondos_reserva_cent, aporte_patronal_cent)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  const ahora = new Date().toISOString();
  db.transaction(() => {
    for (const f of calculo.filas) {
      const r = f.resultado;
      delRol.run(f.empleado.id, periodo);
      delProv.run(f.empleado.id, periodo);
      insRol.run(f.empleado.id, periodo, r.totalIngresosCent, r.totalEgresosCent, r.netoCent, JSON.stringify(f), ahora);
      const p = r.provisiones;
      insProv.run(f.empleado.id, periodo, p.decimoTerceroCent, p.decimoCuartoCent, p.fondosReservaCent, p.aportePatronalCent);
    }
  })();
  return calculo;
  })();
}

/** Saldos registrados: no inventa meses ni valores anteriores a la carga. */
function completarBeneficios(db: DB, empleadoId: number, r: ResultadoRol) {
  const previas = db.prepare(`SELECT periodo, detalle_json FROM roles_pago WHERE empleado_id=? AND periodo<? ORDER BY periodo`)
    .all(empleadoId, r.periodo) as { periodo: string; detalle_json: string }[];
  const anteriores = previas.map(p => (JSON.parse(p.detalle_json) as FilaRol).resultado);
  const saldo = (tipo: "Tercero" | "Cuarto", codigo: string) => {
    const clave = tipo === "Tercero" ? "decimoTerceroCent" : "decimoCuartoCent";
    const saldoAnteriorCent = anteriores.reduce((sum, x) => sum + (x.provisiones[clave] ?? 0) - valorConcepto(x, codigo), 0);
    const devengadoCent = r.provisiones[clave];
    const pagadoCent = valorConcepto(r, codigo);
    if (saldoAnteriorCent < 0 || pagadoCent > saldoAnteriorCent + devengadoCent) {
      throw new Error(`El pago del décimo ${tipo.toLowerCase()} supera su saldo registrado (${((saldoAnteriorCent + devengadoCent) / 100).toFixed(2)} USD)`);
    }
    return { desdePeriodo: previas[0]?.periodo ?? r.periodo, hastaPeriodo: r.periodo, saldoAnteriorCent, devengadoCent, pagadoCent,
      saldoCent: saldoAnteriorCent + devengadoCent - pagadoCent };
  };
  r.beneficios = { decimoTercero: saldo("Tercero", "pago_decimo_tercero_acumulado"), decimoCuarto: saldo("Cuarto", "pago_decimo_cuarto_acumulado") };
}

// ---------------------------------------------------------------- Roles guardados

export interface RolGuardado extends FilaRol {
  generadoEn: string;
}

export function rolesDelPeriodo(db: DB, periodo: string): RolGuardado[] {
  const rows = db
    .prepare("SELECT detalle_json, generado_en FROM roles_pago WHERE periodo = ?")
    .all(periodo) as { detalle_json: string; generado_en: string }[];
  return rows
    .map((r) => ({ ...(JSON.parse(r.detalle_json) as FilaRol), generadoEn: r.generado_en }))
    .sort((a, b) =>
      `${a.empleado.apellidos} ${a.empleado.nombres}`.localeCompare(`${b.empleado.apellidos} ${b.empleado.nombres}`),
    );
}

export function rolDeEmpleado(db: DB, periodo: string, empleadoId: number): RolGuardado | null {
  const r = db
    .prepare("SELECT detalle_json, generado_en FROM roles_pago WHERE periodo = ? AND empleado_id = ?")
    .get(periodo, empleadoId) as { detalle_json: string; generado_en: string } | undefined;
  return r ? { ...(JSON.parse(r.detalle_json) as FilaRol), generadoEn: r.generado_en } : null;
}

export interface ResumenPeriodo {
  periodo: string;
  empleados: number;
  ingresosCent: number;
  egresosCent: number;
  netoCent: number;
  provisionesCent: number;
  generadoEn: string;
}

export function resumenPeriodos(db: DB): ResumenPeriodo[] {
  return db
    .prepare(
      `SELECT r.periodo, COUNT(*) AS empleados, SUM(r.ingresos_cent) AS ingresosCent, SUM(r.egresos_cent) AS egresosCent,
         SUM(r.neto_cent) AS netoCent, MAX(r.generado_en) AS generadoEn,
         COALESCE((SELECT SUM(p.decimo_tercero_cent + p.decimo_cuarto_cent + p.fondos_reserva_cent + p.aporte_patronal_cent)
                   FROM provisiones p WHERE p.periodo = r.periodo), 0) AS provisionesCent
       FROM roles_pago r GROUP BY r.periodo ORDER BY r.periodo DESC`,
    )
    .all() as ResumenPeriodo[];
}
