import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type Database from "better-sqlite3";
import { openDb } from "../db";
import { migrarNominaDetallada } from "../db/nomina-detallada";
import { actualizarEmpleado, crearCargo, crearEmpleado, getEmpleado, guardarNovedades, listNovedades, type EmpleadoInput, type Novedad } from "../repo";
import { calcularPeriodo, generarYGuardar, rolesDelPeriodo } from "./service";
import { valorConcepto } from "./engine";

let db: Database.Database;
let empleadoId: number;
let base: EmpleadoInput;
beforeEach(() => {
  db = openDb(":memory:");
  const params: Record<string, string> = { sbu: "482", iess_aporte_personal: "9.45", iess_aporte_patronal: "11.15", fondos_reserva_pct: "8.33", divisor_horas_mes: "240", recargo_nocturno_pct: "25", recargo_suplementaria_pct: "50", recargo_extraordinaria_pct: "100", limite_suplementarias_mes: "60", limite_suplementarias_dia: "4" };
  const stmt = db.prepare("INSERT INTO parametros (regimen_id, clave, valor, tipo, vigente_desde) VALUES (1, ?, ?, 'numero', '2020-01-01')");
  Object.entries(params).forEach(([k, v]) => stmt.run(k, v));
  const cargoId = crearCargo(db, { nombre: "Analista de prueba", estructuraOcupacional: "C1", descripcion: "" });
  base = { cedula: "0000000000", nombres: "Prueba", apellidos: "Nómina", cargoId, regimenId: 1, sueldoBaseCent: 80000,
    fechaIngreso: "2020-01-01", region: "SIERRA_ORIENTE", mensualiza13: false, mensualiza14: false, aplicaFondosReserva: true };
  empleadoId = crearEmpleado(db, base);
});
afterEach(() => db.close());

function nov(periodo: string, cambios: Partial<Omit<Novedad, "empleadoId" | "periodo">>) {
  guardarNovedades(db, periodo, [{ empleadoId, horasNocturnas: 0, horasSuplementarias: 0, horasExtraordinarias: 0,
    otrosIngresosCent: 0, descuentosCent: 0, observacion: "Prueba", ...cambios }]);
}

describe("nómina detallada e historial", () => {
  it("persiste, reemplaza y elimina descuentos sin duplicarlos ni alterar las copias emitidas", () => {
    nov("2026-10", { descuentosCent: 5000 });
    migrarNominaDetallada(db);
    expect(listNovedades(db, "2026-10").get(empleadoId)?.descuentosCent).toBe(5000);
    const anterior = generarYGuardar(db, "2026-10").filas[0].resultado;
    const detalle = [{ concepto: "Anticipo", valorCent: 3000 }, { concepto: "Préstamo", valorCent: 2005 }];
    nov("2026-10", { descuentosCent: 99999, descuentosDetalle: detalle });
    expect(listNovedades(db, "2026-10").get(empleadoId)).toMatchObject({ descuentosCent: 5005, descuentosDetalle: detalle });
    expect(rolesDelPeriodo(db, "2026-10")[0].resultado).toEqual(anterior);
    const actual = generarYGuardar(db, "2026-10").filas[0].resultado;
    expect(valorConcepto(actual, "descuentos")).toBe(5005);
    expect(actual.netoCent).toBe(anterior.netoCent - 5);
    expect(generarYGuardar(db, "2026-10").filas[0].resultado).toEqual(actual);
    nov("2026-10", { descuentosCent: 5005, descuentosDetalle: [] });
    expect(listNovedades(db, "2026-10").get(empleadoId)).toMatchObject({ descuentosCent: 0, descuentosDetalle: [] });
    expect(valorConcepto(generarYGuardar(db, "2026-10").filas[0].resultado, "descuentos")).toBe(0);
  });

  it("revierte toda la escritura si un descuento del lote es inválido", () => {
    nov("2026-10", { descuentosCent: 1000 });
    const fila = listNovedades(db, "2026-10").get(empleadoId)!;
    expect(() => guardarNovedades(db, "2026-10", [{ ...fila, descuentosDetalle: [{ concepto: "Anticipo", valorCent: 500 }] }, { ...fila, descuentosDetalle: [{ concepto: "", valorCent: 300 }] }])).toThrow(/concepto/);
    expect(listNovedades(db, "2026-10").get(empleadoId)?.descuentosCent).toBe(1000);
  });
  it("paga acumulados contra el saldo registrado y regenerar no duplica movimientos", () => {
    generarYGuardar(db, "2026-09");
    nov("2026-10", { pagoDecimoTerceroCent: 10000, pagoDecimoCuartoCent: 8034, impuestoRentaCent: 2500 });
    const rol = generarYGuardar(db, "2026-10").filas[0].resultado;
    expect(rol.beneficios?.decimoTercero).toMatchObject({ saldoAnteriorCent: 6667, devengadoCent: 6667, pagadoCent: 10000, saldoCent: 3334 });
    expect(rol.beneficios?.decimoCuarto.saldoCent).toBe(0);
    expect(rol.netoCent).toBe(94638);
    expect(generarYGuardar(db, "2026-10").filas[0].resultado).toEqual(rol);
    expect(rolesDelPeriodo(db, "2026-10")).toHaveLength(1);
    expect(db.prepare("SELECT COUNT(*) n FROM provisiones").get()).toEqual({ n: 2 });
  });

  it("rechaza pagos superiores al saldo sin guardar un rol parcial", () => {
    nov("2026-09", { pagoDecimoTerceroCent: 99999 });
    expect(calcularPeriodo(db, "2026-09").errores[0]).toMatch(/supera su saldo/);
    expect(() => generarYGuardar(db, "2026-09")).toThrow(/supera su saldo/);
    expect(rolesDelPeriodo(db, "2026-09")).toHaveLength(0);
  });

  it("conserva las condiciones anteriores y los fondos IESS no reducen el sueldo", () => {
    generarYGuardar(db, "2026-09");
    actualizarEmpleado(db, empleadoId, { ...base, mensualiza13: true, fondosReservaModalidad: "IESS", condicionesVigenteDesde: "2026-10-01" });
    const sep = calcularPeriodo(db, "2026-09").filas[0];
    expect(sep.empleado.mensualiza13).toBe(false);
    expect(valorConcepto(sep.resultado, "fondos_reserva")).toBe(6664);
    const oct = generarYGuardar(db, "2026-10").filas[0].resultado;
    expect(valorConcepto(oct, "fondos_reserva")).toBe(0);
    expect(oct.provisiones.fondosReservaCent).toBe(6664);
    expect(valorConcepto(oct, "aporte_iess_personal")).toBe(7560);
    expect(oct.provisiones.aportePatronalCent).toBe(8920);
    expect(oct.beneficios?.decimoTercero.saldoCent).toBe(6667);
    expect(() => generarYGuardar(db, "2026-09")).toThrow(/roles posteriores/);
  });

  it("impide sobrescribir condiciones de periodos emitidos", () => {
    generarYGuardar(db, "2026-09");
    expect(() => actualizarEmpleado(db, empleadoId, { ...base, mensualiza14: true, condicionesVigenteDesde: "2026-09-01" })).toThrow(/roles guardados/);
    expect(getEmpleado(db, empleadoId)?.mensualiza14).toBe(false);
  });

  it("convierte la base una sola vez y mantiene el régimen anterior en su historial", () => {
    db.prepare("UPDATE empleados SET regimen_id=2 WHERE id=?").run(empleadoId);
    db.prepare("UPDATE historial_condiciones_nomina SET regimen_id=2 WHERE empleado_id=?").run(empleadoId);
    db.prepare("DELETE FROM migraciones WHERE clave='nomina-detallada-base-ct-2026-10'").run();
    migrarNominaDetallada(db);
    expect(getEmpleado(db, empleadoId)?.regimenCodigo).toBe("CT");
    expect(db.prepare("SELECT regimen_id FROM historial_condiciones_nomina WHERE empleado_id=? AND vigente_desde='2020-01-01'").get(empleadoId)).toEqual({ regimen_id: 2 });
    db.prepare("UPDATE empleados SET regimen_id=3 WHERE id=?").run(empleadoId);
    migrarNominaDetallada(db);
    expect(getEmpleado(db, empleadoId)?.regimenCodigo).toBe("LOEP");
    expect(db.prepare("SELECT COUNT(*) n FROM regimenes").get()).toEqual({ n: 3 });
  });
});
