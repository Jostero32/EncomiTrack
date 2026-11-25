/**
 * Datos de ejemplo. Reinicia los datos (no las tablas) y carga:
 * - Parámetros iniciales (VALORES DE REFERENCIA: verificar con la normativa vigente).
 * - Datos de la empresa (sin tocar el logo cargado).
 * - Cargos y 8 empleados del organigrama (4 Código de Trabajo, 4 LOSEP) con cédulas válidas.
 *   La Gerencia General queda creada como cargo sin titular ("por definir").
 * - Novedades del mes anterior y del mes en curso.
 * - El rol del mes anterior ya generado (para ver Panel e Historial con datos).
 */
import { migrate, openDb } from "../src/lib/db/index";
import { completarCedula } from "../src/lib/cedula";
import {
  crearCargo,
  crearEmpleado,
  crearEscalaSalarial,
  guardarDetalleEscala,
  guardarEmpresa,
  guardarNovedades,
  type CargoInput,
  type EmpleadoInput,
  type TipoParametro,
} from "../src/lib/repo";
import { generarYGuardar } from "../src/lib/payroll/service";
import { periodoActual, periodoAnterior, sumarMeses } from "../src/lib/periodo";

const db = openDb();

// `--si-vacia` (arranque del contenedor): solo carga los datos de ejemplo en una
// base recién creada; si ya hay parámetros, no toca nada.
if (
  process.argv.includes("--si-vacia") &&
  (db.prepare("SELECT COUNT(*) AS n FROM parametros").get() as { n: number }).n > 0
) {
  console.log("La base ya tiene datos: no se cargan los datos de ejemplo.");
  db.close();
  process.exit(0);
}

const CT = 1;
const LOSEP = 2;
const LOEP = 3;

db.exec(`
  DELETE FROM provisiones; DELETE FROM roles_pago; DELETE FROM novedades;
  DELETE FROM historial_condiciones_nomina; DELETE FROM historial_sueldos; DELETE FROM empleados; DELETE FROM cargo_escalas; DELETE FROM cargos;
  DELETE FROM escala_salarial_detalles; DELETE FROM escalas_salariales; DELETE FROM parametros;
`);

// ------------------------------------------------------------ Parámetros
type P = [number | null, string, string, TipoParametro, string, string, string | null];
const DESDE = "2020-01-01";
const params: P[] = [
  // Historial del SBU para demostrar las vigencias
  [null, "sbu", "460.00", "moneda", "Salario Básico Unificado", "2024-01-01", "2024-12-31"],
  [null, "sbu", "470.00", "moneda", "Salario Básico Unificado", "2025-01-01", "2025-12-31"],
  [null, "sbu", "482.00", "moneda", "Salario Básico Unificado", "2026-01-01", null],
];
const porRegimen: [string, string, TipoParametro, string][] = [
  ["iess_aporte_personal", "9.45", "porcentaje", "Aporte personal al IESS"],
  ["iess_aporte_patronal", "11.15", "porcentaje", "Aporte patronal al IESS"],
  ["fondos_reserva_pct", "8.33", "porcentaje", "Fondos de reserva (desde el segundo año de servicio)"],
  ["divisor_horas_mes", "240", "numero", "Horas mensuales para calcular el valor hora"],
  ["limite_suplementarias_mes", "60", "numero", "Límite mensual de horas suplementarias"],
  ["limite_suplementarias_dia", "4", "numero", "Límite diario de horas suplementarias"],
];
const recargos: Record<number, [string, string, string]> = {
  [CT]: ["25", "50", "100"],
  [LOSEP]: ["25", "25", "100"],
  // Valores iniciales de referencia; deben validarse con la normativa interna
  // de la empresa pública y editarse desde Parámetros cuando corresponda.
  [LOEP]: ["25", "50", "100"],
};
for (const reg of [CT, LOSEP, LOEP]) {
  for (const [clave, valor, tipo, desc] of porRegimen) params.push([reg, clave, valor, tipo, desc, DESDE, null]);
  const [noc, sup, ext] = recargos[reg];
  params.push([reg, "recargo_nocturno_pct", noc, "porcentaje", "Recargo por trabajo nocturno (19h00 a 06h00)", DESDE, null]);
  params.push([reg, "recargo_suplementaria_pct", sup, "porcentaje", "Recargo de horas suplementarias", DESDE, null]);
  params.push([reg, "recargo_extraordinaria_pct", ext, "porcentaje", "Recargo de horas extraordinarias (fines de semana y feriados)", DESDE, null]);
}
const insParam = db.prepare(
  "INSERT INTO parametros (regimen_id, clave, valor, tipo, descripcion, vigente_desde, vigente_hasta) VALUES (?,?,?,?,?,?,?)",
);
db.transaction(() => params.forEach((p) => insParam.run(...p)))();

// ------------------------------------------------------------ Empresa
// Se conserva el logo que se haya cargado desde Configuración → Empresa.
guardarEmpresa(db, {
  razonSocial: "EncomiTrack",
  nombreComercial: "",
  ruc: "1891234567001",
  direccion: "",
  telefono: "",
  email: "",
  representanteLegal: "",
  mostrarNombreConLogo: true,
});

// ------------------------------------------------------------ Escala salarial
const escalaCt2026 = crearEscalaSalarial(db, {
  regimenId: CT,
  nombre: "Piso general transitorio 2026",
  anio: 2026,
  vigenteDesde: "2026-01-01",
  vigenteHasta: null,
  estado: "TRANSITORIA",
  referenciaLegal: "Acuerdo Ministerial MDT-2025-195",
  fuenteUrl: "https://www.trabajo.gob.ec/wp-content/uploads/downloads/2026/01/ACUERDO-MINISTERIAL-MDT-2025-195.pdf",
  observacion: "Piso general; debe sustituirse por la fila sectorial exacta cuando sea superior.",
});
guardarDetalleEscala(db, {
  escalaId: escalaCt2026,
  codigoReferencia: "SBU-GENERAL",
  denominacion: "Salario Básico Unificado 2026",
  comision: "",
  rama: "",
  estructuraOcupacional: null,
  minimoCent: 48200,
  tipoValor: "MENSUAL",
  regla: "MINIMO",
});
// Restaura el catálogo oficial 2025 eliminado por el reinicio de demostración.
migrate(db);

// ------------------------------------------------------------ Empleados
const anterior = periodoAnterior();
const actual = periodoActual();
// Ingresó hace unos 7 meses: menos de un año, sin fondos de reserva
const ingresoReciente = `${sumarMeses(actual, -7)}-02`;

// Organigrama: Gerencia General (por definir) con cinco dependencias directas;
// Técnica administrativa supervisa a asistencia, bodega y seguridad. Cada
// estructura ocupacional es la oficial del código IESS vinculado (catálogo MDT).
// `superior` es el cargo al que reporta; cada superior se declara antes que sus subordinados.
const cargos: (CargoInput & { superior?: string })[] = [
  { nombre: "Gerente general", estructuraOcupacional: "A1", descripcion: "Dirección general de la empresa", asignacionesSalariales: [{ regimenId: CT, codigoReferencia: "1918200000101" }] },
  { nombre: "Jefa de ventas", superior: "Gerente general", estructuraOcupacional: "B2", descripcion: "Jefatura del área comercial", asignacionesSalariales: [{ regimenId: CT, codigoReferencia: "1920000000008" }] },
  { nombre: "Técnica administrativa", superior: "Gerente general", estructuraOcupacional: "D1", descripcion: "Coordinación administrativa, de bodega y seguridad", asignacionesSalariales: [{ regimenId: CT, codigoReferencia: "1910000000028" }, { regimenId: LOSEP, codigoReferencia: "LOSEP-G09" }] },
  { nombre: "Analista de talento humano", superior: "Gerente general", estructuraOcupacional: "C1", descripcion: "Gestión de talento humano", asignacionesSalariales: [{ regimenId: CT, codigoReferencia: "1910000000013" }, { regimenId: LOSEP, codigoReferencia: "LOSEP-G12" }] },
  { nombre: "Contadora general", superior: "Gerente general", estructuraOcupacional: "C1", descripcion: "Gestión contable y financiera", asignacionesSalariales: [{ regimenId: CT, codigoReferencia: "1910000000012" }] },
  { nombre: "Secretaria", superior: "Gerente general", estructuraOcupacional: "D1", descripcion: "Soporte administrativo de gerencia", asignacionesSalariales: [{ regimenId: CT, codigoReferencia: "1910000000024" }, { regimenId: LOSEP, codigoReferencia: "LOSEP-G07" }] },
  { nombre: "Asistente administrativo", superior: "Técnica administrativa", estructuraOcupacional: "D1", descripcion: "Asistencia administrativa", asignacionesSalariales: [{ regimenId: CT, codigoReferencia: "1910000000028" }] },
  { nombre: "Operario de bodega", superior: "Técnica administrativa", estructuraOcupacional: "D1", descripcion: "Soporte operativo de bodega", asignacionesSalariales: [{ regimenId: CT, codigoReferencia: "1910000000023" }] },
  { nombre: "Guardia de seguridad", superior: "Técnica administrativa", estructuraOcupacional: "E1", descripcion: "Soporte operativo de seguridad", asignacionesSalariales: [{ regimenId: CT, codigoReferencia: "1911740000051" }, { regimenId: LOSEP, codigoReferencia: "LOSEP-G05" }] },
];
const cargoIds = new Map<string, number>();
for (const { superior, ...cargo } of cargos) {
  cargoIds.set(cargo.nombre, crearCargo(db, { ...cargo, reportaAId: superior ? cargoIds.get(superior)! : null }));
}
const cargoId = (nombre: string) => cargoIds.get(nombre)!;

const empleados: EmpleadoInput[] = [
  { cedula: completarCedula("180345672"), nombres: "María José", apellidos: "Andrade Torres", cargoId: cargoId("Contadora general"), regimenId: CT, sueldoBaseCent: 120000, fechaIngreso: "2018-03-05", region: "SIERRA_ORIENTE", mensualiza13: true, mensualiza14: true, aplicaFondosReserva: true },
  { cedula: completarCedula("091876543"), nombres: "Carlos Andrés", apellidos: "Pérez Villacís", cargoId: cargoId("Asistente administrativo"), regimenId: CT, sueldoBaseCent: 60000, fechaIngreso: "2021-07-12", region: "COSTA_GALAPAGOS", mensualiza13: false, mensualiza14: false, aplicaFondosReserva: true },
  { cedula: completarCedula("050298765"), nombres: "Luis Alberto", apellidos: "Guamán Chicaiza", cargoId: cargoId("Operario de bodega"), regimenId: CT, sueldoBaseCent: 48200, fechaIngreso: ingresoReciente, region: "SIERRA_ORIENTE", mensualiza13: true, mensualiza14: true, aplicaFondosReserva: true },
  { cedula: completarCedula("130567891"), nombres: "Ana Lucía", apellidos: "Salazar Mena", cargoId: cargoId("Jefa de ventas"), regimenId: CT, sueldoBaseCent: 150000, fechaIngreso: "2019-11-18", region: "COSTA_GALAPAGOS", mensualiza13: true, mensualiza14: true, aplicaFondosReserva: true },
  { cedula: completarCedula("171234567"), nombres: "Jorge Eduardo", apellidos: "Ortiz Naranjo", cargoId: cargoId("Analista de talento humano"), regimenId: CT, sueldoBaseCent: 141200, fechaIngreso: "2016-02-01", region: "SIERRA_ORIENTE", mensualiza13: true, mensualiza14: true, aplicaFondosReserva: true },
  { cedula: completarCedula("180912345"), nombres: "Diana Carolina", apellidos: "Cevallos Ruiz", cargoId: cargoId("Técnica administrativa"), regimenId: CT, sueldoBaseCent: 98600, fechaIngreso: "2020-09-14", region: "SIERRA_ORIENTE", mensualiza13: true, mensualiza14: true, aplicaFondosReserva: true },
  { cedula: completarCedula("060411223"), nombres: "Pedro Javier", apellidos: "Morales Pazmiño", cargoId: cargoId("Guardia de seguridad"), regimenId: CT, sueldoBaseCent: 67500, fechaIngreso: "2015-05-04", region: "SIERRA_ORIENTE", mensualiza13: true, mensualiza14: true, aplicaFondosReserva: true },
  { cedula: completarCedula("100523456"), nombres: "Sofía Alejandra", apellidos: "Vega Castillo", cargoId: cargoId("Secretaria"), regimenId: CT, sueldoBaseCent: 81700, fechaIngreso: "2023-08-21", region: "SIERRA_ORIENTE", mensualiza13: true, mensualiza14: false, aplicaFondosReserva: true },
];
const ids = empleados.map((e) => crearEmpleado(db, e));

// ------------------------------------------------------------ Novedades
const nov = (i: number, noc: number, sup: number, ext: number, otros: number, desc: number, obs = "") => ({
  empleadoId: ids[i],
  horasNocturnas: noc,
  horasSuplementarias: sup,
  horasExtraordinarias: ext,
  otrosIngresosCent: otros,
  descuentosCent: desc,
  observacion: obs,
});
guardarNovedades(db, anterior, [
  nov(0, 0, 6, 0, 0, 0, "Cierre contable"),
  nov(1, 0, 12, 4, 0, 2500, "Descuento por anticipo"),
  nov(2, 0, 20, 8, 0, 0, "Inventario"),
  nov(3, 0, 0, 0, 25000, 0, "Comisión por ventas"),
  nov(4, 0, 8, 0, 0, 0),
  nov(5, 0, 10, 6, 0, 1500, "Descuento comisariato"),
  nov(6, 40, 16, 8, 0, 0, "Turnos nocturnos"),
  nov(7, 0, 4, 0, 0, 0),
]);
guardarNovedades(db, actual, [
  nov(0, 0, 4, 0, 0, 0),
  nov(1, 0, 10, 0, 0, 2500, "Descuento por anticipo"),
  nov(2, 0, 15, 4, 0, 0),
  nov(3, 0, 0, 0, 18000, 0, "Comisión por ventas"),
  nov(4, 0, 10, 0, 0, 0),
  nov(5, 0, 12, 0, 0, 1500, "Descuento comisariato"),
  nov(6, 40, 20, 8, 0, 0, "Turnos nocturnos"),
  nov(7, 0, 6, 0, 0, 0),
]);

// ------------------------------------------------------------ Rol del mes anterior
const calc = generarYGuardar(db, anterior);
console.log(`Parámetros: ${params.length} | Empleados: ${ids.length}`);
console.log(`Novedades cargadas para ${anterior} y ${actual}`);
console.log(`Rol de ${anterior} generado para ${calc.filas.length} empleados`);
db.close();
