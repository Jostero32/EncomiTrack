import { describe, expect, it } from "vitest";
import { calcularRol, valorConcepto, type EmpleadoCalculo, type ParametrosRol } from "./engine";

/**
 * Parámetros de prueba (todos los importes en centavos en los comentarios).
 * SBU = 482.00 -> 48200 c.  Aporte personal 9.45 %, patronal 11.15 %,
 * fondos de reserva 8.33 %, divisor 240 h.
 */
const BASE = {
  sbu: "482.00",
  iess_aporte_personal: "9.45",
  iess_aporte_patronal: "11.15",
  fondos_reserva_pct: "8.33",
  divisor_horas_mes: "240",
  limite_suplementarias_mes: "60",
  limite_suplementarias_dia: "4",
};
const PARAMS_CT: ParametrosRol = {
  ...BASE,
  recargo_nocturno_pct: "25",
  recargo_suplementaria_pct: "50",
  recargo_extraordinaria_pct: "100",
};
const PARAMS_LOSEP: ParametrosRol = {
  ...BASE,
  recargo_nocturno_pct: "25",
  recargo_suplementaria_pct: "25",
  recargo_extraordinaria_pct: "100",
};

const PERIODO = "2026-09";

function empleado(over: Partial<EmpleadoCalculo>): EmpleadoCalculo {
  return {
    id: 1,
    sueldoBaseCent: 80000,
    fechaIngreso: "2020-01-01",
    mensualiza13: true,
    mensualiza14: true,
    aplicaFondosReserva: true,
    ...over,
  };
}

const sinNovedad = { horasNocturnas: 0, horasSuplementarias: 0, horasExtraordinarias: 0, otrosIngresosCent: 0, descuentosCent: 0 };

describe("motor de roles de pago", () => {
  it("desglosa los descuentos y usa su suma una sola vez, sin alterar IESS ni beneficios", () => {
    const base = calcularRol(empleado({}), sinNovedad, PARAMS_CT, PERIODO);
    const r = calcularRol(empleado({}), { ...sinNovedad, descuentosCent: 99999, impuestoRentaCent: 1500,
      descuentosDetalle: [{ concepto: "Anticipo de sueldo", valorCent: 3001 }, { concepto: "Cuota de préstamo", valorCent: 2002 }, { concepto: "Otro motivo", valorCent: 1003 }] }, PARAMS_CT, PERIODO);
    expect(r.egresos.map(c => [c.nombre, c.valorCent])).toEqual([["Aporte personal IESS", 7560], ["Impuesto a la renta", 1500], ["Anticipo de sueldo", 3001], ["Cuota de préstamo", 2002], ["Otro motivo", 1003]]);
    expect(valorConcepto(r, "descuentos")).toBe(6006);
    expect(r.totalEgresosCent).toBe(15066);
    expect(r.netoCent).toBe(base.netoCent - 6006 - 1500);
    expect(r.baseIessCent).toBe(base.baseIessCent);
    expect(r.provisiones).toEqual(base.provisiones);
    expect(r.ingresos).toEqual(base.ingresos);
  });
  it("separa fondos destinados al IESS y descuenta renta sin alterar bases ni aporte patronal", () => {
    const r = calcularRol(empleado({ fondosReservaModalidad: "IESS" }), { ...sinNovedad, impuestoRentaCent: 2000 }, PARAMS_CT, PERIODO);
    expect(valorConcepto(r, "fondos_reserva")).toBe(0);
    expect(r.provisiones.fondosReservaCent).toBe(6664);
    expect(r.baseIessCent).toBe(80000);
    expect(r.provisiones.aportePatronalCent).toBe(8920);
    expect(r.netoCent).toBe(81124);
  });
  it("1. CT con sueldo base, sin extras, mensualizando 13 y 14", () => {
    /*
     * Sueldo 800.00, 30 días             = 80000
     * Base IESS                           = 80000
     * 13ro  = 80000 / 12 = 6666.67        -> 6667
     * 14to  = 48200 / 12 = 4016.67        -> 4017
     * Fondos = 80000 × 8.33 % = 6664.00   -> 6664
     * Total ingresos = 80000+6667+4017+6664 = 97348
     * IESS personal = 80000 × 9.45 % = 7560
     * Neto = 97348 − 7560 = 89788
     * Patronal = 80000 × 11.15 % = 8920
     */
    const r = calcularRol(empleado({}), sinNovedad, PARAMS_CT, PERIODO);
    expect(valorConcepto(r, "sueldo")).toBe(80000);
    expect(valorConcepto(r, "decimo_tercero")).toBe(6667);
    expect(valorConcepto(r, "decimo_cuarto")).toBe(4017);
    expect(valorConcepto(r, "fondos_reserva")).toBe(6664);
    expect(r.totalIngresosCent).toBe(97348);
    expect(valorConcepto(r, "aporte_iess_personal")).toBe(7560);
    expect(r.netoCent).toBe(89788);
    expect(r.provisiones.aportePatronalCent).toBe(8920);
    expect(r.provisiones.decimoTerceroCent).toBe(0);
    expect(r.provisiones.decimoCuartoCent).toBe(0);
  });

  it("2. CT con horas suplementarias y extraordinarias", () => {
    /*
     * Sueldo 600.00 -> 60000; valor hora = 60000 / 240 = 250
     * Suplementarias: 10 h × 250 × 1.50 = 3750
     * Extraordinarias: 5 h × 250 × 2.00 = 2500
     * Base IESS = 60000 + 3750 + 2500 = 66250
     * 13ro = 66250 / 12 = 5520.83 -> 5521
     * 14to = 4017
     * Fondos = 66250 × 8.33 % = 5518.625 -> 5519
     * Total ingresos = 66250 + 5521 + 4017 + 5519 = 81307
     * IESS = 66250 × 9.45 % = 6260.625 -> 6261
     * Neto = 81307 − 6261 = 75046
     */
    const r = calcularRol(
      empleado({ sueldoBaseCent: 60000 }),
      { ...sinNovedad, horasSuplementarias: 10, horasExtraordinarias: 5 },
      PARAMS_CT,
      PERIODO,
    );
    expect(r.valorHoraCent).toBe(250);
    expect(valorConcepto(r, "horas_suplementarias")).toBe(3750);
    expect(valorConcepto(r, "horas_extraordinarias")).toBe(2500);
    expect(r.baseIessCent).toBe(66250);
    expect(valorConcepto(r, "decimo_tercero")).toBe(5521);
    expect(valorConcepto(r, "fondos_reserva")).toBe(5519);
    expect(r.totalIngresosCent).toBe(81307);
    expect(valorConcepto(r, "aporte_iess_personal")).toBe(6261);
    expect(r.netoCent).toBe(75046);
  });

  it("3. LOSEP con horas nocturnas y suplementarias (recargo 25 %)", () => {
    /*
     * Sueldo 1200.00 -> 120000; valor hora = 120000 / 240 = 500
     * Nocturnas: 8 h × 500 × 0.25 = 1000
     * Suplementarias LOSEP: 10 h × 500 × 1.25 = 6250   (en CT serían 7500)
     * Base IESS = 120000 + 1000 + 6250 = 127250
     * 13ro = 127250 / 12 = 10604.17 -> 10604
     * 14to = 4017
     * Fondos = 127250 × 8.33 % = 10599.925 -> 10600
     * Total ingresos = 127250 + 10604 + 4017 + 10600 = 152471
     * IESS = 127250 × 9.45 % = 12025.125 -> 12025
     * Neto = 152471 − 12025 = 140446
     */
    const nov = { ...sinNovedad, horasNocturnas: 8, horasSuplementarias: 10 };
    const r = calcularRol(empleado({ sueldoBaseCent: 120000 }), nov, PARAMS_LOSEP, PERIODO);
    expect(valorConcepto(r, "horas_nocturnas")).toBe(1000);
    expect(valorConcepto(r, "horas_suplementarias")).toBe(6250);
    expect(r.baseIessCent).toBe(127250);
    expect(r.totalIngresosCent).toBe(152471);
    expect(valorConcepto(r, "aporte_iess_personal")).toBe(12025);
    expect(r.netoCent).toBe(140446);

    const ct = calcularRol(empleado({ sueldoBaseCent: 120000 }), nov, PARAMS_CT, PERIODO);
    expect(valorConcepto(ct, "horas_suplementarias")).toBe(7500);
  });

  it("4. Ingreso a mitad de mes (proporcionalidad)", () => {
    /*
     * Ingreso 16-09-2026 -> días = 30 − 16 + 1 = 15
     * Sueldo = 90000 × 15 / 30 = 45000
     * 13ro = 45000 / 12 = 3750
     * 14to = 48200 × 15 / 360 = 2008.33 -> 2008
     * Fondos = 0 (menos de 1 año)
     * Total ingresos = 45000 + 3750 + 2008 = 50758
     * IESS = 45000 × 9.45 % = 4252.5 -> 4253 (half-up)
     * Neto = 50758 − 4253 = 46505
     */
    const r = calcularRol(empleado({ sueldoBaseCent: 90000, fechaIngreso: "2026-09-16" }), sinNovedad, PARAMS_CT, PERIODO);
    expect(r.diasTrabajados).toBe(15);
    expect(valorConcepto(r, "sueldo")).toBe(45000);
    expect(valorConcepto(r, "decimo_tercero")).toBe(3750);
    expect(valorConcepto(r, "decimo_cuarto")).toBe(2008);
    expect(valorConcepto(r, "fondos_reserva")).toBe(0);
    expect(r.totalIngresosCent).toBe(50758);
    expect(valorConcepto(r, "aporte_iess_personal")).toBe(4253);
    expect(r.netoCent).toBe(46505);
  });

  it("5. No mensualiza décimos: el neto baja y aparece la provisión", () => {
    /*
     * Mismo empleado del caso 1 (800.00), sin mensualizar.
     * Total ingresos = 80000 + 6664 (fondos) = 86664
     * Neto = 86664 − 7560 = 79104   (vs 89788 mensualizando)
     * Provisión 13ro = 6667, provisión 14to = 4017
     */
    const r = calcularRol(empleado({ mensualiza13: false, mensualiza14: false }), sinNovedad, PARAMS_CT, PERIODO);
    expect(valorConcepto(r, "decimo_tercero")).toBe(0);
    expect(valorConcepto(r, "decimo_cuarto")).toBe(0);
    expect(r.totalIngresosCent).toBe(86664);
    expect(r.netoCent).toBe(79104);
    expect(r.provisiones.decimoTerceroCent).toBe(6667);
    expect(r.provisiones.decimoCuartoCent).toBe(4017);
  });

  it("6. Menos de 1 año de servicio: sin fondos de reserva", () => {
    /*
     * Ingreso 10-01-2026, periodo 09-2026 (mes completo). Sueldo 700.00.
     * 13ro = 70000 / 12 = 5833.33 -> 5833 ; 14to = 4017 ; fondos = 0
     * Total ingresos = 70000 + 5833 + 4017 = 79850
     * IESS = 70000 × 9.45 % = 6615
     * Neto = 79850 − 6615 = 73235
     */
    const r = calcularRol(empleado({ sueldoBaseCent: 70000, fechaIngreso: "2026-01-10" }), sinNovedad, PARAMS_CT, PERIODO);
    expect(valorConcepto(r, "fondos_reserva")).toBe(0);
    expect(r.totalIngresosCent).toBe(79850);
    expect(r.netoCent).toBe(73235);
  });

  it("advierte cuando las suplementarias superan el límite mensual", () => {
    const r = calcularRol(empleado({}), { ...sinNovedad, horasSuplementarias: 61 }, PARAMS_CT, PERIODO);
    expect(r.advertencias.length).toBeGreaterThan(0);
  });

  it("rechaza parámetros faltantes", () => {
    const { sbu: _omit, ...incompletos } = PARAMS_CT;
    expect(() => calcularRol(empleado({}), sinNovedad, incompletos as ParametrosRol, PERIODO)).toThrow(/sbu/);
  });
});
