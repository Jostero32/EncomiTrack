import ExcelJS from "exceljs";
import { BRAND, argb } from "../brand";
import type { EmpresaDocumento } from "../empresa-logo";
import { centsToExcelNumber } from "../money";
import { nombrePeriodo } from "../periodo";
import type { FilaRol } from "../payroll/service";
import { COLUMNAS_NOMINA, COLUMNAS_OBLIGACIONES } from "../payroll/columnas";
import { descuentosDelRol } from "../payroll/descuentos";

const MONEDA = '"USD" #,##0.00;[Red]-"USD" #,##0.00';
const AZUL = argb(BRAND.colores.azul);
const AZUL_SUAVE = argb(BRAND.colores.azulSuave);
const FILA_ALTERNA = argb(BRAND.colores.filaAlterna);
const GRIS = argb(BRAND.colores.gris);
/** Fila donde empieza la tabla; las anteriores son el encabezado con el logo. */
const INICIO_TABLA = 5;

function estilizarEncabezado(row: ExcelJS.Row) {
  row.eachCell((c) => {
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL } };
    c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    c.border = { bottom: { style: "thin", color: { argb: "FF999999" } } };
  });
  row.height = 32;
}

/** Logo a la izquierda (columnas A–B) y títulos a la derecha, sobre las filas 1 a 3. */
function titulo(
  wb: ExcelJS.Workbook,
  ws: ExcelJS.Worksheet,
  empresa: EmpresaDocumento,
  texto: string,
  sub: string,
  cols: number,
) {
  const escala = Math.min(170 / empresa.logo.ancho, 56 / empresa.logo.alto);
  const imagen = wb.addImage({ buffer: empresa.logo.png as unknown as ExcelJS.Buffer, extension: "png" });
  ws.addImage(imagen, {
    tl: { col: 0.15, row: 0.2 },
    ext: { width: empresa.logo.ancho * escala, height: empresa.logo.alto * escala },
    editAs: "oneCell",
  });
  const lineas: [string, Partial<ExcelJS.Font>][] = [
    [texto, { bold: true, size: 14, color: { argb: AZUL } }],
    [sub, { color: { argb: GRIS } }],
    [[empresa.razonSocial, empresa.ruc && `RUC ${empresa.ruc}`].filter(Boolean).join(" · "), { color: { argb: GRIS }, size: 9 }],
  ];
  lineas.forEach(([valor, font], i) => {
    ws.mergeCells(i + 1, 3, i + 1, Math.max(cols, 3));
    const celda = ws.getCell(i + 1, 3);
    celda.value = valor;
    celda.font = font;
    celda.alignment = { vertical: "middle" };
    ws.getRow(i + 1).height = 20;
  });
  // Franja de marca bajo el encabezado.
  for (let c = 1; c <= cols; c++) {
    const color = c / cols <= 0.6 ? AZUL : c / cols <= 0.8 ? argb(BRAND.colores.amarillo) : argb(BRAND.colores.rojo);
    ws.getCell(INICIO_TABLA - 1, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
  }
  ws.getRow(INICIO_TABLA - 1).height = 4;
}

/** Agrega filas de datos, fila de totales con SUM y formato de moneda. */
function tabla(
  ws: ExcelJS.Worksheet,
  columnas: { header: string; width: number; money?: boolean }[],
  filas: (string | number)[][],
) {
  const inicio = INICIO_TABLA;
  ws.columns = columnas.map((c) => ({ width: c.width }));
  const head = ws.getRow(inicio);
  head.values = columnas.map((c) => c.header);
  estilizarEncabezado(head);

  filas.forEach((valores, i) => {
    const row = ws.getRow(inicio + 1 + i);
    row.values = valores;
    columnas.forEach((c, j) => {
      const cell = row.getCell(j + 1);
      if (c.money) cell.numFmt = MONEDA;
      if (i % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILA_ALTERNA } };
    });
  });

  const primera = inicio + 1;
  const ultima = inicio + filas.length;
  const tot = ws.getRow(ultima + 1);
  tot.getCell(1).value = "TOTALES";
  columnas.forEach((c, j) => {
    const cell = tot.getCell(j + 1);
    if (c.money && filas.length) {
      const col = ws.getColumn(j + 1).letter;
      cell.value = filas.some(f => typeof f[j] !== "number") ? "No disponible" : { formula: `SUM(${col}${primera}:${col}${ultima})` };
      cell.numFmt = MONEDA;
    }
    cell.font = { bold: true };
    cell.border = { top: { style: "double" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL_SUAVE } };
  });
  ws.views = [{ state: "frozen", ySplit: inicio }];
}

export async function excelConsolidado(periodo: string, filas: FilaRol[], empresa: EmpresaDocumento): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = `${empresa.nombreVisible} · ${BRAND.sistema}`;
  wb.created = new Date();
  const m = centsToExcelNumber;
  const nombre = (f: FilaRol) => `${f.empleado.apellidos} ${f.empleado.nombres}`;

  // ---------------- Resumen
  const res = wb.addWorksheet("Resumen");
  titulo(wb, res, empresa, "Rol de pagos consolidado", nombrePeriodo(periodo), 8);
  tabla(
    res,
    [
      { header: "Cédula", width: 13 },
      { header: "Empleado", width: 32 },
      { header: "Cargo", width: 26 },
      { header: "Régimen", width: 10 },
      { header: "Días", width: 7 },
      { header: "Total ingresos", width: 16, money: true },
      { header: "Total egresos", width: 16, money: true },
      { header: "Neto a recibir", width: 16, money: true },
    ],
    filas.map((f) => [
      f.empleado.cedula,
      nombre(f),
      f.empleado.cargo,
      f.empleado.regimenCodigo,
      f.resultado.diasTrabajados,
      m(f.resultado.totalIngresosCent),
      m(f.resultado.totalEgresosCent),
      m(f.resultado.netoCent),
    ]),
  );

  // ---------------- Detalle por concepto
  const det = wb.addWorksheet("Detalle por concepto");
  const conceptos = [...COLUMNAS_NOMINA, ...COLUMNAS_OBLIGACIONES.filter(c => c.clave !== "frDirecto" && !COLUMNAS_NOMINA.some(n => n.clave === c.clave))].map(c => ({ header: c.nombre, get: c.valor }));
  titulo(wb, det, empresa, "Detalle por concepto", nombrePeriodo(periodo), conceptos.length + 3);
  tabla(
    det,
    [
      { header: "Cédula", width: 13 },
      { header: "Empleado", width: 30 },
      { header: "Régimen", width: 9 },
      ...conceptos.map((c) => ({ header: c.header, width: 15, money: true })),
    ],
    filas.map((f) => [f.empleado.cedula, nombre(f), f.empleado.regimenCodigo, ...conceptos.map((c) => c.header.startsWith("Saldo ") && !f.resultado.beneficios ? "No disponible" : m(c.get(f)))]),
  );

  const modalidades = wb.addWorksheet("Modalidades de pago");
  titulo(wb, modalidades, empresa, "Modalidades y vigencia del rol", nombrePeriodo(periodo), 6);
  tabla(modalidades, [
    { header: "Empleado", width: 32 }, { header: "Régimen", width: 12 },
    { header: "13.º", width: 18 }, { header: "14.º", width: 18 },
    { header: "Fondos de reserva", width: 23 }, { header: "Saldos registrados desde", width: 24 },
  ], filas.map(f => [nombre(f), f.empleado.regimenCodigo,
    f.empleado.mensualiza13 ? "Mensualizado" : "Acumulado", f.empleado.mensualiza14 ? "Mensualizado" : "Acumulado",
    f.empleado.fondosReservaModalidad === "IESS" ? "Depósito al IESS" : "Pago directo",
    f.resultado.beneficios?.decimoTercero.desdePeriodo ?? "Sin estado histórico"]));
  const descuentos = wb.addWorksheet("Descuentos por concepto");
  titulo(wb, descuentos, empresa, "Descuentos manuales por concepto", nombrePeriodo(periodo), 5);
  tabla(descuentos, [
    { header: "Cédula", width: 13 }, { header: "Empleado", width: 32 },
    { header: "Periodo", width: 12 }, { header: "Concepto", width: 50 },
    { header: "Importe", width: 18, money: true },
  ], filas.flatMap(f => descuentosDelRol(f.resultado).map(d => [f.empleado.cedula, nombre(f), periodo, d.concepto, m(d.valorCent)])));
  descuentos.getColumn(4).alignment = { wrapText: true, vertical: "middle" };
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
