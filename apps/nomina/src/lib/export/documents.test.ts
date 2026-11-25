import fs from "node:fs";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { calcularRol, NOVEDAD_VACIA, type ParametrosRol } from "../payroll/engine";
import type { FilaRol } from "../payroll/service";
import type { EmpresaDocumento } from "../empresa-logo";
import { excelConsolidado } from "./excel";
import { pdfConsolidado, pdfRolIndividual } from "./pdf";

const parametros: ParametrosRol = { sbu: "482", iess_aporte_personal: "9.45", iess_aporte_patronal: "11.15", fondos_reserva_pct: "8.33", divisor_horas_mes: "240", recargo_nocturno_pct: "25", recargo_suplementaria_pct: "50", recargo_extraordinaria_pct: "100", limite_suplementarias_mes: "60", limite_suplementarias_dia: "4" };
const fila: FilaRol = { empleado: { id: 1, cedula: "0000000000", nombres: "Prueba", apellidos: "Documento", cargo: "Analista", regimenCodigo: "CT", regimenNombre: "Código de Trabajo", region: "SIERRA_ORIENTE", fechaIngreso: "2020-01-01", sueldoBaseCent: 80000, mensualiza13: true, mensualiza14: true, fondosReservaModalidad: "IESS" },
  resultado: calcularRol({ id: 1, sueldoBaseCent: 80000, fechaIngreso: "2020-01-01", mensualiza13: true, mensualiza14: true, aplicaFondosReserva: true, fondosReservaModalidad: "IESS" }, null, parametros, "2026-10") };
const empresa: EmpresaDocumento = { razonSocial: "Prueba", nombreVisible: "Prueba", ruc: "", direccion: "", mostrarNombre: true,
  logo: { png: fs.readFileSync("public/brand/logo-generico.png"), ancho: 512, alto: 512 } };

describe("documentos de nómina detallada", () => {
  it("exporta cada descuento en una fila numérica y mantiene su total en el consolidado", async () => {
    const conDescuentos = { ...fila, resultado: calcularRol({ ...fila.empleado, aplicaFondosReserva: true }, { ...NOVEDAD_VACIA,
      descuentosDetalle: [{ concepto: "Anticipo de sueldo", valorCent: 3001 }, { concepto: "Cuota de préstamo", valorCent: 2002 }] }, parametros, "2026-10") };
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await excelConsolidado("2026-10", [conDescuentos], empresa) as unknown as ExcelJS.Buffer);
    const descuentos = wb.getWorksheet("Descuentos por concepto")!;
    expect(descuentos.getRow(6).getCell(4).value).toBe("Anticipo de sueldo");
    expect(descuentos.getRow(6).getCell(5).value).toBe(30.01);
    expect(descuentos.getRow(7).getCell(4).value).toBe("Cuota de préstamo");
    expect(descuentos.getRow(7).getCell(5).value).toBe(20.02);
    expect(descuentos.getRow(8).getCell(5).value).toEqual({ formula: "SUM(E6:E7)" });
    const detalle = wb.getWorksheet("Detalle por concepto")!;
    let columna = 0;
    detalle.getRow(5).eachCell((c, i) => { if (c.value === "Otros descuentos") columna = i; });
    expect(detalle.getRow(6).getCell(columna).value).toBe(50.03);
    for (const pdf of [await pdfRolIndividual(conDescuentos, empresa), await pdfConsolidado("2026-10", [conDescuentos], empresa)]) {
      expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    }
  });
  it("exporta aportes de ambas partes y destino de fondos como valores numéricos independientes", async () => {
    const buffer = await excelConsolidado("2026-10", [fila], empresa);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const hoja = wb.getWorksheet("Detalle por concepto")!;
    const cabecera = hoja.getRow(5);
    function valor(nombre: string) {
      let columna = 0;
      cabecera.eachCell((cell, index) => { if (cell.value === nombre) columna = index; });
      expect(columna).toBeGreaterThan(0);
      return hoja.getRow(6).getCell(columna).value;
    }
    expect(valor("IESS empleado")).toBe(75.6);
    expect(valor("IESS empleador")).toBe(89.2);
    expect(valor("F. reserva al IESS")).toBe(66.64);
    expect(valor("F. reserva directos")).toBe(0);
    expect(valor("Neto a recibir")).toBe(831.24);
    expect(wb.getWorksheet("Modalidades de pago")?.getRow(6).getCell(5).value).toBe("Depósito al IESS");
  });

  it("genera PDF individual y consolidado legibles de una página para un empleado", async () => {
    for (const pdf of [await pdfRolIndividual(fila, empresa), await pdfConsolidado("2026-10", [fila], empresa)]) {
      expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
      expect((pdf.toString("latin1").match(/Type \/Page\b/g) ?? []).length).toBe(1);
    }
  });
});
