import path from "node:path";
import React from "react";
import { Document, Font, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { BRAND } from "../brand";
import type { EmpresaDocumento } from "../empresa-logo";
import { formatUSD } from "../money";
import { fechaCorta, nombrePeriodo } from "../periodo";
import { valorConcepto } from "../payroll/engine";
import type { FilaRol } from "../payroll/service";
import { COLUMNAS_NOMINA, COLUMNAS_OBLIGACIONES } from "../payroll/columnas";
import { descuentosDelRol } from "../payroll/descuentos";

const { azul: AZUL, azulSuave: AZUL_SUAVE, gris: GRIS, borde: BORDE, tinta: TINTA, filaAlterna: FILA_ALTERNA } = BRAND.colores;

// Misma tipografía que la interfaz (Inter, archivos WOFF estáticos).
const fuente = (peso: number) =>
  path.join(process.cwd(), "node_modules", "@fontsource", "inter", "files", `inter-latin-${peso}-normal.woff`);
Font.register({
  family: "Inter",
  fonts: [
    { src: fuente(400), fontWeight: 400 },
    { src: fuente(600), fontWeight: 600 },
    { src: fuente(700), fontWeight: 700 },
  ],
});
// Sin guiones de corte en nombres y montos.
Font.registerHyphenationCallback((palabra) => [palabra]);

const s = StyleSheet.create({
  page: { padding: 36, paddingTop: 30, fontSize: 9, fontFamily: "Inter", color: TINTA },
  franja: { flexDirection: "row", height: 3, marginBottom: 10 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1.5, borderBottomColor: AZUL, paddingBottom: 8, marginBottom: 12 },
  marca: { flexDirection: "row", alignItems: "center", gap: 10 },
  empresa: { fontSize: 13, fontWeight: 700, color: AZUL },
  sub: { color: GRIS, marginTop: 2 },
  titulo: { fontSize: 11, fontWeight: 700, textAlign: "right" },
  datos: { flexDirection: "row", flexWrap: "wrap", borderWidth: 1, borderColor: BORDE, borderRadius: 3, padding: 8, marginBottom: 12 },
  dato: { width: "50%", flexDirection: "row", paddingVertical: 2 },
  datoLabel: { width: 112, color: GRIS },
  cols: { flexDirection: "row", gap: 12 },
  col: { flex: 1, borderWidth: 1, borderColor: BORDE, borderRadius: 3 },
  colHead: { backgroundColor: AZUL, color: "#fff", fontWeight: 700, padding: 5 },
  fila: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 6, paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: BORDE },
  filaAlt: { backgroundColor: FILA_ALTERNA },
  detalle: { fontSize: 7, color: GRIS, marginTop: 1 },
  total: { flexDirection: "row", justifyContent: "space-between", padding: 6, fontWeight: 700, backgroundColor: AZUL_SUAVE },
  neto: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, padding: 10, backgroundColor: AZUL, color: "#fff", borderRadius: 3 },
  netoTxt: { fontSize: 12, fontWeight: 700 },
  prov: { marginTop: 12, borderWidth: 1, borderColor: BORDE, borderRadius: 3, padding: 8 },
  firmas: { flexDirection: "row", justifyContent: "space-around", marginTop: 70 },
  firma: { width: 180, borderTopWidth: 1, borderTopColor: TINTA, paddingTop: 4, textAlign: "center" },
  pie: { position: "absolute", bottom: 20, left: 36, right: 36, fontSize: 7, color: GRIS, textAlign: "center" },
  // consolidado
  th: { backgroundColor: AZUL, color: "#fff", fontWeight: 700, fontSize: 6.8, padding: 4 },
  td: { fontSize: 7, padding: 4 },
  right: { textAlign: "right" },
});

type Empresa = EmpresaDocumento;

/** Tamaño del logo dentro de una caja de 150 × 40 pt conservando su proporción. */
function medidasLogo({ ancho, alto }: { ancho: number; alto: number }) {
  const escala = Math.min(150 / ancho, 40 / alto);
  return { width: ancho * escala, height: alto * escala };
}

function Encabezado({ empresa, titulo, periodo }: { empresa: Empresa; titulo: string; periodo: string }) {
  return (
    <>
      <View style={s.franja} fixed>
        <View style={{ flex: 3, backgroundColor: AZUL }} />
        <View style={{ flex: 1, backgroundColor: BRAND.colores.amarillo }} />
        <View style={{ flex: 1, backgroundColor: BRAND.colores.rojo }} />
      </View>
      <View style={s.header}>
        <View style={s.marca}>
          <Image src={{ data: empresa.logo.png, format: "png" }} style={medidasLogo(empresa.logo)} />
          <View>
            {empresa.mostrarNombre ? <Text style={s.empresa}>{empresa.razonSocial}</Text> : <Text style={{ fontWeight: 600 }}>{empresa.razonSocial}</Text>}
            {empresa.ruc ? <Text style={s.sub}>RUC {empresa.ruc}</Text> : null}
            {empresa.direccion ? <Text style={s.sub}>{empresa.direccion}</Text> : null}
          </View>
        </View>
        <View>
          <Text style={[s.titulo, { color: AZUL }]}>{titulo}</Text>
          <Text style={[s.sub, s.right]}>Periodo: {nombrePeriodo(periodo)}</Text>
        </View>
      </View>
    </>
  );
}

function RolPagina({ fila, empresa }: { fila: FilaRol; empresa: Empresa }) {
  const { empleado: e, resultado: r } = fila;
  const datos: [string, string][] = [
    ["Empleado", `${e.apellidos} ${e.nombres}`],
    ["Cédula", e.cedula],
    ["Cargo", e.cargo || "-"],
    ["Régimen", e.regimenNombre],
    ["Fecha de ingreso", fechaCorta(e.fechaIngreso)],
    ["Sueldo base", formatUSD(e.sueldoBaseCent)],
    ["Días trabajados", String(r.diasTrabajados)],
    ["Base aportación IESS", formatUSD(r.baseIessCent)],
    ["Décimo tercero", e.mensualiza13 ? "Mensualizado" : "Acumulado"],
    ["Décimo cuarto", e.mensualiza14 ? "Mensualizado" : "Acumulado"],
    ["Fondos de reserva", e.fondosReservaModalidad === "IESS" ? "Depósito al IESS" : "Pago directo"],
  ];
  const lista = (titulo: string, items: typeof r.ingresos, total: number) => (
    <View style={s.col}>
      <Text style={s.colHead}>{titulo}</Text>
      {items.filter(c => !c.codigo.startsWith("pago_decimo_") || c.valorCent !== 0).map((c, i) => (
        <View key={c.codigo} wrap={false} style={[s.fila, i % 2 === 1 ? s.filaAlt : {}]}>
          <View style={{ flex: 1, paddingRight: 6 }}>
            <Text>{c.nombre}</Text>
            {c.detalle ? <Text style={s.detalle}>{c.detalle}</Text> : null}
          </View>
          <Text>{formatUSD(c.valorCent)}</Text>
        </View>
      ))}
      <View style={s.total}>
        <Text>Total {titulo.toLowerCase()}</Text>
        <Text>{formatUSD(total)}</Text>
      </View>
    </View>
  );
  return (
    <Page size="A4" style={s.page}>
      <Encabezado empresa={empresa} titulo="ROL DE PAGOS INDIVIDUAL" periodo={r.periodo} />
      <View style={s.datos}>
        {datos.map(([l, v]) => (
          <View key={l} style={s.dato}>
            <Text style={s.datoLabel}>{l}:</Text>
            <Text style={{ fontWeight: 700 }}>{v}</Text>
          </View>
        ))}
      </View>
      <View style={s.cols}>
        {lista("Ingresos", r.ingresos, r.totalIngresosCent)}
        {lista("Egresos", r.egresos, r.totalEgresosCent)}
      </View>
      <View style={s.neto}>
        <Text style={s.netoTxt}>NETO A RECIBIR</Text>
        <Text style={s.netoTxt}>{formatUSD(r.netoCent)}</Text>
      </View>
      <View style={s.prov}>
        <Text style={{ fontWeight: 700, marginBottom: 4 }}>IESS · aportes del empleado y del empleador</Text>
        <Text>Empleado: {formatUSD(r.baseIessCent)} × {r.parametros.iess_aporte_personal}% = {formatUSD(valorConcepto(r, "aporte_iess_personal"))} (descuento del rol)</Text>
        <Text>Empleador: {formatUSD(r.baseIessCent)} × {r.parametros.iess_aporte_patronal}% = {formatUSD(r.provisiones.aportePatronalCent)} (a cargo de la empresa)</Text>
        <Text>Fondos de reserva con destino IESS: {formatUSD(r.provisiones.fondosReservaCent)} · No se descuentan del sueldo.</Text>
        <Text style={{ fontWeight: 700, marginTop: 6 }}>Décimos acumulados · devengado del mes</Text>
        <Text>13.º: {formatUSD(r.provisiones.decimoTerceroCent)} · 14.º: {formatUSD(r.provisiones.decimoCuartoCent)}</Text>
        {r.beneficios ? <>
          <Text>Saldo 13.º: anterior {formatUSD(r.beneficios.decimoTercero.saldoAnteriorCent)} + devengado {formatUSD(r.beneficios.decimoTercero.devengadoCent)} − pago {formatUSD(r.beneficios.decimoTercero.pagadoCent)} = {formatUSD(r.beneficios.decimoTercero.saldoCent)}</Text>
          <Text>Saldo 14.º: anterior {formatUSD(r.beneficios.decimoCuarto.saldoAnteriorCent)} + devengado {formatUSD(r.beneficios.decimoCuarto.devengadoCent)} − pago {formatUSD(r.beneficios.decimoCuarto.pagadoCent)} = {formatUSD(r.beneficios.decimoCuarto.saldoCent)}</Text>
          <Text style={s.detalle}>Saldos de periodos registrados desde {r.beneficios.decimoTercero.desdePeriodo}. No acreditan depósitos realizados.</Text>
        </> : <Text style={s.detalle}>Rol histórico: no contiene un estado de saldos acumulados.</Text>}
      </View>
      <View style={s.firmas}>
        <Text style={s.firma}>Elaborado por</Text>
        <Text style={s.firma}>
          Recibí conforme{"\n"}
          {e.nombres} {e.apellidos}
          {"\n"}C.I. {e.cedula}
        </Text>
      </View>
      <Text style={s.pie} fixed>
        {empresa.nombreVisible} · Documento generado por el sistema {BRAND.sistema} · {new Date().toLocaleDateString("es-EC")}
      </Text>
    </Page>
  );
}

export async function pdfRolIndividual(fila: FilaRol, empresa: Empresa): Promise<Buffer> {
  return renderToBuffer(
    <Document title={`Rol ${fila.resultado.periodo} ${fila.empleado.apellidos}`}>
      <RolPagina fila={fila} empresa={empresa} />
    </Document>,
  );
}

type Col = { h: string; w: number } & ({ text: (f: FilaRol) => string } | { cents: (f: FilaRol) => number });
const IDENTIDAD: Col[] = [
  { h: "Empleado", w: 20, text: f => f.empleado.apellidos + " " + f.empleado.nombres },
  { h: "Cédula", w: 9, text: f => f.empleado.cedula },
  { h: "Rég.", w: 5, text: f => f.empleado.regimenCodigo },
];
const COLS: Col[] = [...IDENTIDAD, ...COLUMNAS_NOMINA.map(c => ({ h: c.nombre, w: 8, cents: c.valor }))];
const OBLIGACIONES: Col[] = [...IDENTIDAD, ...COLUMNAS_OBLIGACIONES.map(c => ({ h: c.nombre, w: 10, cents: c.valor }))];

export async function pdfConsolidado(periodo: string, filas: FilaRol[], empresa: Empresa): Promise<Buffer> {
  const descuentos = filas.flatMap(f => descuentosDelRol(f.resultado).map(d => ({ ...d, empleado: f.empleado })));
  const tabla = (columnas: Col[], titulo: string) => {
    const totalAncho = columnas.reduce((sum, c) => sum + c.w, 0);
    const estilo = (c: Col) => ({ width: String(100 * c.w / totalAncho) + "%", textAlign: "cents" in c ? "right" as const : "left" as const });
    return <View style={{ marginTop: 14 }}>
      <Text style={{ fontWeight: 700, color: AZUL, marginBottom: 6 }}>{titulo}</Text>
      <View style={{ flexDirection: "row" }}>{columnas.map(c => <Text key={c.h} style={[s.th, estilo(c)]}>{c.h}</Text>)}</View>
      {filas.map((f, i) => <View key={f.empleado.id} wrap={false} style={[{ flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: BORDE }, i % 2 ? s.filaAlt : {}]}>
        {columnas.map(c => <Text key={c.h} style={[s.td, estilo(c)]}>{"text" in c ? c.text(f) : c.h.startsWith("Saldo ") && !f.resultado.beneficios ? "—" : formatUSD(c.cents(f))}</Text>)}
      </View>)}
      <View style={{ flexDirection: "row", backgroundColor: AZUL_SUAVE }}>{columnas.map((c, i) => <Text key={c.h} style={[s.td, estilo(c), { fontWeight: 700 }]}>{i === 0 ? "TOTALES (" + filas.length + ")" : "cents" in c ? c.h.startsWith("Saldo ") && filas.some(f => !f.resultado.beneficios) ? "—" : formatUSD(filas.reduce((sum, f) => sum + c.cents(f), 0)) : ""}</Text>)}</View>
    </View>;
  };
  return renderToBuffer(<Document title={"Rol consolidado " + periodo}>
    <Page size="A3" orientation="landscape" style={s.page}>
      <Encabezado empresa={empresa} titulo="NÓMINA DETALLADA" periodo={periodo} />
      {tabla(COLS, "Ingresos, descuentos y neto del empleado")}
      {tabla(OBLIGACIONES, "Aportes IESS de ambas partes y beneficios acumulados")}
      {descuentos.length > 0 && <View style={{ marginTop: 14 }}>
        <Text style={{ fontWeight: 700, color: AZUL, marginBottom: 6 }}>Descuentos manuales por concepto</Text>
        <View style={{ flexDirection: "row" }}>
          <Text style={[s.th, { width: "30%" }]}>Empleado</Text><Text style={[s.th, { width: "15%" }]}>Cédula</Text><Text style={[s.th, { width: "40%" }]}>Concepto</Text><Text style={[s.th, s.right, { width: "15%" }]}>Importe</Text>
        </View>
        {descuentos.map((d, i) => <View key={i} wrap={false} style={[{ flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: BORDE }, i % 2 ? s.filaAlt : {}]}>
          <Text style={[s.td, { width: "30%" }]}>{d.empleado.apellidos} {d.empleado.nombres}</Text><Text style={[s.td, { width: "15%" }]}>{d.empleado.cedula}</Text><Text style={[s.td, { width: "40%" }]}>{d.concepto}</Text><Text style={[s.td, s.right, { width: "15%" }]}>{formatUSD(d.valorCent)}</Text>
        </View>)}
        <View wrap={false} style={[s.total, { fontSize: 7 }]}><Text>Total descuentos manuales</Text><Text>{formatUSD(descuentos.reduce((sum, d) => sum + d.valorCent, 0))}</Text></View>
      </View>}
      <Text style={[s.detalle, { marginTop: 10 }]}>El aporte patronal es responsabilidad del empleador. Los fondos destinados al IESS no reducen el sueldo. Los saldos corresponden a periodos registrados; en roles históricos sin estado de beneficios, el saldo no está disponible. La retención IR es la registrada en Novedades.</Text>
      <View style={s.firmas}><Text style={s.firma}>Elaborado por</Text><Text style={s.firma}>Revisado por</Text><Text style={s.firma}>Aprobado por</Text></View>
      <Text style={s.pie} fixed render={({ pageNumber, totalPages }) => "Página " + pageNumber + " de " + totalPages + " · " + empresa.nombreVisible + " · " + BRAND.sistema} />
    </Page>
  </Document>);
}
