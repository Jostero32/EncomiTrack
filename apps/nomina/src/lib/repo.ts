/** Capa de acceso a datos (SQLite). Todas las funciones reciben la conexión. */
import type Database from "better-sqlite3";
import type { EstructuraOcupacional } from "./estructura-ocupacional";
import { parseScaled } from "./money";
import { diaAnterior, inicioPeriodo } from "./periodo";
import { resolverDescuentos, totalDescuentos, type DescuentoManual } from "./payroll/descuentos";

type DB = Database.Database;

export interface Regimen {
  id: number;
  codigo: string;
  nombre: string;
}

export type Region = "SIERRA_ORIENTE" | "COSTA_GALAPAGOS";

export interface Cargo {
  id: number;
  nombre: string;
  estructuraOcupacional: EstructuraOcupacional | null;
  descripcion: string;
  activo: boolean;
  empleados: number;
  asignacionesSalariales: Record<string, string>;
  /** Cargo superior inmediato (null en la cabeza del organigrama). */
  reportaAId: number | null;
}

export interface CargoInput {
  nombre: string;
  estructuraOcupacional: EstructuraOcupacional;
  descripcion: string;
  reportaAId?: number | null;
  asignacionesSalariales?: { regimenId: number; codigoReferencia: string }[];
}

export type EstadoEscala = "BORRADOR" | "TRANSITORIA" | "OFICIAL" | "REFERENCIAL";
export type TipoValorEscala = "MENSUAL" | "TARIFA";
export type ReglaValorEscala = "MINIMO" | "FIJO" | "TECHO" | "REFERENCIA";

export interface EscalaSalarial {
  id: number;
  regimenId: number;
  regimenCodigo: string;
  regimenNombre: string;
  nombre: string;
  anio: number;
  vigenteDesde: string;
  vigenteHasta: string | null;
  estado: EstadoEscala;
  referenciaLegal: string;
  fuenteUrl: string;
  observacion: string;
  detalles: number;
}

export interface EscalaSalarialInput {
  regimenId: number;
  nombre: string;
  anio: number;
  vigenteDesde: string;
  vigenteHasta: string | null;
  estado: EstadoEscala;
  referenciaLegal: string;
  fuenteUrl: string;
  observacion: string;
}

export interface DetalleEscalaSalarial {
  id: number;
  escalaId: number;
  regimenId: number;
  regimenCodigo: string;
  escalaNombre: string;
  escalaEstado: EstadoEscala;
  escalaVigenteDesde: string;
  escalaVigenteHasta: string | null;
  codigoReferencia: string;
  denominacion: string;
  comision: string;
  rama: string;
  estructuraOcupacional: EstructuraOcupacional | null;
  minimoCent: number;
  tipoValor: TipoValorEscala;
  regla: ReglaValorEscala;
}

export interface DetalleEscalaInput {
  escalaId: number;
  codigoReferencia: string;
  denominacion: string;
  comision: string;
  rama: string;
  estructuraOcupacional: EstructuraOcupacional | null;
  minimoCent: number;
  tipoValor: TipoValorEscala;
  regla: ReglaValorEscala;
}

export interface MinimoSalarial {
  detalleId: number;
  escalaId: number;
  escalaNombre: string;
  escalaEstado: EstadoEscala;
  codigoReferencia: string;
  denominacion: string;
  minimoCent: number;
  tipoValor: TipoValorEscala;
  regla: ReglaValorEscala;
  vigenteDesde: string;
  vigenteHasta: string | null;
}

export interface ReferenciaSalarialCargo extends MinimoSalarial {
  cargoId: number;
  regimenId: number;
}

export interface HistorialSueldo {
  id: number;
  empleadoId: number;
  sueldoCent: number;
  vigenteDesde: string;
  vigenteHasta: string | null;
  motivo: string;
}

export interface Empleado {
  id: number;
  cedula: string;
  nombres: string;
  apellidos: string;
  cargo: string;
  cargoId: number | null;
  estructuraOcupacional: EstructuraOcupacional | null;
  regimenId: number;
  regimenCodigo: string;
  sueldoBaseCent: number;
  fechaIngreso: string;
  region: Region;
  mensualiza13: boolean;
  mensualiza14: boolean;
  aplicaFondosReserva: boolean;
  fondosReservaModalidad?: "DIRECTO" | "IESS";
  condicionesVigenteDesde?: string;
  activo: boolean;
}

export interface EmpleadoInput {
  cedula: string;
  nombres: string;
  apellidos: string;
  cargoId: number;
  regimenId: number;
  sueldoBaseCent: number;
  fechaIngreso: string;
  region: Region;
  mensualiza13: boolean;
  mensualiza14: boolean;
  aplicaFondosReserva: boolean;
  fondosReservaModalidad?: "DIRECTO" | "IESS";
  condicionesVigenteDesde?: string;
  sueldoVigenteDesde?: string;
  motivoCambioSueldo?: string;
}

export type TipoParametro = "porcentaje" | "moneda" | "numero" | "texto";

export interface Parametro {
  id: number;
  regimenId: number | null;
  clave: string;
  valor: string;
  tipo: TipoParametro;
  descripcion: string;
  vigenteDesde: string;
  vigenteHasta: string | null;
}

export interface Novedad {
  empleadoId: number;
  periodo: string;
  horasNocturnas: number;
  horasSuplementarias: number;
  horasExtraordinarias: number;
  otrosIngresosCent: number;
  descuentosCent: number;
  descuentosDetalle?: DescuentoManual[];
  impuestoRentaCent?: number;
  pagoDecimoTerceroCent?: number;
  pagoDecimoCuartoCent?: number;
  observacion: string;
}

// ---------------------------------------------------------------- Regímenes

export function listRegimenes(db: DB): Regimen[] {
  return db.prepare("SELECT id, codigo, nombre FROM regimenes ORDER BY id").all() as Regimen[];
}

// ---------------------------------------------------------------- Cargos

function mapCargo(r: any): Cargo {
  return {
    id: r.id,
    nombre: r.nombre,
    estructuraOcupacional: r.estructura_ocupacional,
    descripcion: r.descripcion,
    activo: !!r.activo,
    empleados: Number(r.empleados ?? 0),
    asignacionesSalariales: r.asignaciones_json ? JSON.parse(r.asignaciones_json) : {},
    reportaAId: r.reporta_a_id ?? null,
  };
}

const SELECT_CARGO = `
  SELECT c.*, COUNT(e.id) AS empleados,
         COALESCE((
           SELECT json_group_object(CAST(ce.regimen_id AS TEXT), ce.codigo_referencia)
           FROM cargo_escalas ce WHERE ce.cargo_id = c.id
         ), '{}') AS asignaciones_json
  FROM cargos c LEFT JOIN empleados e ON e.cargo_id = c.id`;

export function listCargos(db: DB): Cargo[] {
  return db
    .prepare(
      `${SELECT_CARGO}
       GROUP BY c.id
       ORDER BY c.estructura_ocupacional IS NULL, c.estructura_ocupacional, c.nombre`,
    )
    .all()
    .map(mapCargo);
}

export function getCargo(db: DB, id: number): Cargo | null {
  const row = db
    .prepare(
      `${SELECT_CARGO}
       WHERE c.id = ? GROUP BY c.id`,
    )
    .get(id);
  return row ? mapCargo(row) : null;
}

/** Impide superiores inexistentes y ciclos (A reporta a B y B, directa o indirectamente, a A). */
function validarSuperiorCargo(db: DB, cargoId: number | null, superiorId: number | null) {
  if (superiorId === null) return;
  if (superiorId === cargoId) throw new Error("Un cargo no puede reportarse a sí mismo");
  const superiorDe = db.prepare("SELECT reporta_a_id FROM cargos WHERE id = ?");
  if (!superiorDe.get(superiorId)) throw new Error("El cargo superior no existe");
  const visitados = new Set<number>();
  for (let actual: number | null = superiorId; actual !== null; ) {
    if (actual === cargoId || visitados.has(actual)) {
      throw new Error("La jerarquía formaría un ciclo: el cargo superior depende de este cargo");
    }
    visitados.add(actual);
    actual = (superiorDe.get(actual) as { reporta_a_id: number | null } | undefined)?.reporta_a_id ?? null;
  }
}

export function crearCargo(db: DB, cargo: CargoInput): number {
  return db.transaction(() => {
    const reportaAId = cargo.reportaAId ?? null;
    validarSuperiorCargo(db, null, reportaAId);
    const info = db
      .prepare(
        `INSERT INTO cargos (nombre, estructura_ocupacional, descripcion, activo, reporta_a_id)
         VALUES (@nombre, @estructuraOcupacional, @descripcion, 1, @reportaAId)`,
      )
      .run({ ...cargo, reportaAId });
    const id = Number(info.lastInsertRowid);
    guardarAsignacionesCargo(db, id, cargo.asignacionesSalariales ?? []);
    return id;
  })();
}

export function actualizarCargo(db: DB, id: number, cargo: CargoInput) {
  db.transaction(() => {
    const reportaAId = cargo.reportaAId ?? null;
    validarSuperiorCargo(db, id, reportaAId);
    db.prepare(
      `UPDATE cargos SET nombre=@nombre, estructura_ocupacional=@estructuraOcupacional, descripcion=@descripcion,
         reporta_a_id=@reportaAId
       WHERE id=@id`,
    ).run({ ...cargo, reportaAId, id });
    // Mantiene sincronizadas las columnas heredadas para compatibilidad con
    // exportaciones y copias de datos creadas antes del catálogo de cargos.
    db.prepare("UPDATE empleados SET cargo = ?, estructura_ocupacional = ? WHERE cargo_id = ?").run(
      cargo.nombre,
      cargo.estructuraOcupacional,
      id,
    );
    guardarAsignacionesCargo(db, id, cargo.asignacionesSalariales ?? []);
  })();
}

function guardarAsignacionesCargo(
  db: DB,
  cargoId: number,
  asignaciones: { regimenId: number; codigoReferencia: string }[],
) {
  db.prepare("DELETE FROM cargo_escalas WHERE cargo_id = ?").run(cargoId);
  const insert = db.prepare(
    "INSERT INTO cargo_escalas (cargo_id, regimen_id, codigo_referencia) VALUES (?, ?, ?)",
  );
  for (const asignacion of asignaciones) {
    const codigo = asignacion.codigoReferencia.trim();
    if (codigo) insert.run(cargoId, asignacion.regimenId, codigo);
  }
}

export function setCargoActivo(db: DB, id: number, activo: boolean) {
  db.prepare("UPDATE cargos SET activo = ? WHERE id = ?").run(activo ? 1 : 0, id);
}

// ---------------------------------------------------------------- Escalas salariales

function mapEscala(r: any): EscalaSalarial {
  return {
    id: r.id,
    regimenId: r.regimen_id,
    regimenCodigo: r.regimen_codigo,
    regimenNombre: r.regimen_nombre,
    nombre: r.nombre,
    anio: r.anio,
    vigenteDesde: r.vigente_desde,
    vigenteHasta: r.vigente_hasta,
    estado: r.estado,
    referenciaLegal: r.referencia_legal,
    fuenteUrl: r.fuente_url,
    observacion: r.observacion,
    detalles: Number(r.detalles ?? 0),
  };
}

function mapDetalleEscala(r: any): DetalleEscalaSalarial {
  return {
    id: r.id,
    escalaId: r.escala_id,
    regimenId: r.regimen_id,
    regimenCodigo: r.regimen_codigo,
    escalaNombre: r.escala_nombre,
    escalaEstado: r.escala_estado,
    escalaVigenteDesde: r.escala_vigente_desde,
    escalaVigenteHasta: r.escala_vigente_hasta,
    codigoReferencia: r.codigo_referencia,
    denominacion: r.denominacion,
    comision: r.comision,
    rama: r.rama,
    estructuraOcupacional: r.estructura_ocupacional,
    minimoCent: r.minimo_cent,
    tipoValor: r.tipo_valor,
    regla: r.regla,
  };
}

const SELECT_DETALLE_ESCALA = `
  SELECT d.*, s.regimen_id, r.codigo AS regimen_codigo,
         s.nombre AS escala_nombre, s.estado AS escala_estado,
         s.vigente_desde AS escala_vigente_desde, s.vigente_hasta AS escala_vigente_hasta
  FROM escala_salarial_detalles d
  JOIN escalas_salariales s ON s.id = d.escala_id
  JOIN regimenes r ON r.id = s.regimen_id`;

export function listEscalasSalariales(db: DB): EscalaSalarial[] {
  return db
    .prepare(
      `SELECT s.*, r.codigo AS regimen_codigo, r.nombre AS regimen_nombre, COUNT(d.id) AS detalles
       FROM escalas_salariales s
       JOIN regimenes r ON r.id = s.regimen_id
       LEFT JOIN escala_salarial_detalles d ON d.escala_id = s.id
       GROUP BY s.id
       ORDER BY s.vigente_desde DESC, r.id, s.nombre`,
    )
    .all()
    .map(mapEscala);
}

export function listDetallesEscala(db: DB): DetalleEscalaSalarial[] {
  return db
    .prepare(`${SELECT_DETALLE_ESCALA} ORDER BY s.vigente_desde DESC, r.id, d.codigo_referencia, d.denominacion`)
    .all()
    .map(mapDetalleEscala);
}

/** Última versión visible de cada código estable, útil para asignarlo a cargos. */
export function listOpcionesEscalaCargo(db: DB): DetalleEscalaSalarial[] {
  return db
    .prepare(
      `${SELECT_DETALLE_ESCALA}
       WHERE s.estado <> 'BORRADOR'
         AND NOT EXISTS (
           SELECT 1
           FROM escala_salarial_detalles posterior_d
           JOIN escalas_salariales posterior_s ON posterior_s.id = posterior_d.escala_id
           WHERE posterior_s.regimen_id = s.regimen_id
             AND posterior_d.codigo_referencia = d.codigo_referencia
             AND posterior_s.estado <> 'BORRADOR'
             AND posterior_s.vigente_desde > s.vigente_desde
         )
       ORDER BY r.id, d.denominacion, d.codigo_referencia`,
    )
    .all()
    .map(mapDetalleEscala);
}

export function crearEscalaSalarial(db: DB, escala: EscalaSalarialInput): number {
  return db.transaction(() => {
    if (escala.estado !== "BORRADOR") {
      // Una nueva versión anual cierra automáticamente la versión abierta
      // anterior; nunca modifica detalles ni roles históricos.
      db.prepare(
        `UPDATE escalas_salariales
         SET vigente_hasta = ?
         WHERE regimen_id = ? AND estado <> 'BORRADOR'
           AND vigente_hasta IS NULL AND vigente_desde < ?`,
      ).run(diaAnterior(escala.vigenteDesde), escala.regimenId, escala.vigenteDesde);
    }
    const info = db
      .prepare(
        `INSERT INTO escalas_salariales
          (regimen_id, nombre, anio, vigente_desde, vigente_hasta, estado, referencia_legal, fuente_url, observacion)
         VALUES (@regimenId, @nombre, @anio, @vigenteDesde, @vigenteHasta, @estado, @referenciaLegal, @fuenteUrl, @observacion)`,
      )
      .run(escala);
    return Number(info.lastInsertRowid);
  })();
}

export function actualizarEscalaSalarial(db: DB, id: number, escala: EscalaSalarialInput) {
  db.transaction(() => {
    const existe = db.prepare("SELECT regimen_id FROM escalas_salariales WHERE id = ?").get(id) as
      | { regimen_id: number }
      | undefined;
    if (!existe) throw new Error("Escala salarial no encontrada");
    if (existe.regimen_id !== escala.regimenId) {
      const detalles = db.prepare("SELECT 1 FROM escala_salarial_detalles WHERE escala_id = ? LIMIT 1").get(id);
      if (detalles) throw new Error("No se puede cambiar el régimen de una escala que ya tiene valores");
    }
    if (escala.estado !== "BORRADOR") {
      db.prepare(
        `UPDATE escalas_salariales
         SET vigente_hasta = ?
         WHERE id <> ? AND regimen_id = ? AND estado <> 'BORRADOR'
           AND vigente_hasta IS NULL AND vigente_desde < ?`,
      ).run(diaAnterior(escala.vigenteDesde), id, escala.regimenId, escala.vigenteDesde);
    }
    db.prepare(
      `UPDATE escalas_salariales SET
         regimen_id=@regimenId, nombre=@nombre, anio=@anio, vigente_desde=@vigenteDesde,
         vigente_hasta=@vigenteHasta, estado=@estado, referencia_legal=@referenciaLegal,
         fuente_url=@fuenteUrl, observacion=@observacion
       WHERE id=@id`,
    ).run({ ...escala, id });
  })();
}

export function guardarDetalleEscala(db: DB, detalle: DetalleEscalaInput, id?: number): number {
  if (id) {
    const actual = db.prepare("SELECT escala_id FROM escala_salarial_detalles WHERE id = ?").get(id) as
      | { escala_id: number }
      | undefined;
    if (!actual) throw new Error("Detalle salarial no encontrado");
    if (actual.escala_id !== detalle.escalaId) throw new Error("No se puede mover un detalle a otra escala");
    const utilizado = db.prepare("SELECT 1 FROM historial_sueldos WHERE detalle_escala_id = ? LIMIT 1").get(id);
    if (utilizado) {
      throw new Error("El valor ya fue utilizado en un historial salarial; cree una nueva versión de la escala");
    }
    db.prepare(
      `UPDATE escala_salarial_detalles SET
         codigo_referencia=@codigoReferencia, denominacion=@denominacion, comision=@comision, rama=@rama,
         estructura_ocupacional=@estructuraOcupacional, minimo_cent=@minimoCent, tipo_valor=@tipoValor, regla=@regla
       WHERE id=@id`,
    ).run({ ...detalle, id });
    return id;
  }
  const info = db
    .prepare(
      `INSERT INTO escala_salarial_detalles
        (escala_id, codigo_referencia, denominacion, comision, rama, estructura_ocupacional, minimo_cent, tipo_valor, regla)
       VALUES (@escalaId, @codigoReferencia, @denominacion, @comision, @rama, @estructuraOcupacional, @minimoCent, @tipoValor, @regla)`,
    )
    .run(detalle);
  return Number(info.lastInsertRowid);
}

export function minimoSalarialCargo(
  db: DB,
  cargoId: number,
  regimenId: number,
  fecha: string,
): MinimoSalarial | null {
  // La última fila conocida del código se arrastra cuando todavía no existe
  // una tabla sectorial nueva. Para CT se compara además con el SBU vigente,
  // representado por el código SBU-GENERAL, y prevalece el mayor valor.
  const base = db
    .prepare(
      `SELECT d.id AS detalle_id, s.id AS escala_id, s.nombre AS escala_nombre, s.estado AS escala_estado,
              d.codigo_referencia, d.denominacion, d.minimo_cent, d.tipo_valor, d.regla,
              s.vigente_desde, s.vigente_hasta
       FROM cargo_escalas ce
       JOIN escalas_salariales s ON s.regimen_id = ce.regimen_id
       JOIN escala_salarial_detalles d ON d.escala_id = s.id AND d.codigo_referencia = ce.codigo_referencia
       WHERE ce.cargo_id = ? AND ce.regimen_id = ? AND s.estado <> 'BORRADOR'
         AND s.vigente_desde <= ?
       ORDER BY CASE WHEN s.vigente_hasta IS NULL OR s.vigente_hasta >= ? THEN 1 ELSE 0 END DESC,
                s.vigente_desde DESC,
                CASE s.estado WHEN 'OFICIAL' THEN 4 WHEN 'TRANSITORIA' THEN 3 WHEN 'REFERENCIAL' THEN 2 ELSE 1 END DESC
       LIMIT 1`,
    )
    .get(cargoId, regimenId, fecha, fecha) as any;
  const regimen = db.prepare("SELECT codigo FROM regimenes WHERE id = ?").get(regimenId) as { codigo: string } | undefined;
  const piso = regimen?.codigo === "CT"
    ? (db
        .prepare(
          `SELECT d.id AS detalle_id, s.id AS escala_id, s.nombre AS escala_nombre, s.estado AS escala_estado,
                  d.codigo_referencia, d.denominacion, d.minimo_cent, d.tipo_valor, d.regla,
                  s.vigente_desde, s.vigente_hasta
           FROM escala_salarial_detalles d
           JOIN escalas_salariales s ON s.id = d.escala_id
           WHERE s.regimen_id = ? AND d.codigo_referencia = 'SBU-GENERAL'
             AND s.estado <> 'BORRADOR' AND s.vigente_desde <= ?
             AND (s.vigente_hasta IS NULL OR s.vigente_hasta >= ?)
           ORDER BY s.vigente_desde DESC,
                    CASE s.estado WHEN 'OFICIAL' THEN 4 WHEN 'TRANSITORIA' THEN 3 WHEN 'REFERENCIAL' THEN 2 ELSE 1 END DESC
           LIMIT 1`,
        )
        .get(regimenId, fecha, fecha) as any)
    : null;
  const row = base?.tipo_valor === "TARIFA" ? base : !base || (piso && piso.minimo_cent > base.minimo_cent) ? piso : base;
  if (!row) return null;
  return {
    detalleId: row.detalle_id,
    escalaId: row.escala_id,
    escalaNombre: row.escala_nombre,
    escalaEstado: row.escala_estado,
    codigoReferencia: row.codigo_referencia,
    denominacion: row.denominacion,
    minimoCent: row.minimo_cent,
    tipoValor: row.tipo_valor,
    regla: row.regla,
    vigenteDesde: row.vigente_desde,
    vigenteHasta: row.vigente_hasta,
  };
}

export function listReferenciasSalarialesCargo(db: DB): ReferenciaSalarialCargo[] {
  const rows = db
    .prepare(
      `SELECT ce.cargo_id, ce.regimen_id, d.id AS detalle_id, s.id AS escala_id,
              s.nombre AS escala_nombre, s.estado AS escala_estado,
              d.codigo_referencia, d.denominacion, d.minimo_cent, d.tipo_valor, d.regla,
              s.vigente_desde, s.vigente_hasta
       FROM cargo_escalas ce
       JOIN escalas_salariales s ON s.regimen_id = ce.regimen_id AND s.estado <> 'BORRADOR'
       JOIN escala_salarial_detalles d ON d.escala_id = s.id AND d.codigo_referencia = ce.codigo_referencia
       UNION
       SELECT c.id AS cargo_id, r.id AS regimen_id, d.id AS detalle_id, s.id AS escala_id,
              s.nombre AS escala_nombre, s.estado AS escala_estado,
              d.codigo_referencia, d.denominacion, d.minimo_cent, d.tipo_valor, d.regla,
              s.vigente_desde, s.vigente_hasta
       FROM cargos c
       JOIN regimenes r ON r.codigo = 'CT'
       JOIN escalas_salariales s ON s.regimen_id = r.id AND s.estado <> 'BORRADOR'
       JOIN escala_salarial_detalles d ON d.escala_id = s.id AND d.codigo_referencia = 'SBU-GENERAL'
       ORDER BY cargo_id, regimen_id, vigente_desde DESC`,
    )
    .all() as any[];
  return rows.map((row) => ({
    cargoId: row.cargo_id,
    regimenId: row.regimen_id,
    detalleId: row.detalle_id,
    escalaId: row.escala_id,
    escalaNombre: row.escala_nombre,
    escalaEstado: row.escala_estado,
    codigoReferencia: row.codigo_referencia,
    denominacion: row.denominacion,
    minimoCent: row.minimo_cent,
    tipoValor: row.tipo_valor,
    regla: row.regla,
    vigenteDesde: row.vigente_desde,
    vigenteHasta: row.vigente_hasta,
  }));
}

// ---------------------------------------------------------------- Empleados

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapEmpleado(r: any): Empleado {
  return {
    id: r.id,
    cedula: r.cedula,
    nombres: r.nombres,
    apellidos: r.apellidos,
    cargo: r.cargo_catalogo_nombre ?? r.cargo,
    cargoId: r.cargo_id,
    estructuraOcupacional: r.cargo_catalogo_estructura ?? r.estructura_ocupacional,
    regimenId: r.regimen_id,
    regimenCodigo: r.regimen_codigo,
    sueldoBaseCent: r.sueldo_base_cent,
    fechaIngreso: r.fecha_ingreso,
    region: r.region,
    mensualiza13: !!r.mensualiza_13,
    mensualiza14: !!r.mensualiza_14,
    aplicaFondosReserva: !!r.aplica_fondos_reserva,
    fondosReservaModalidad: r.fondos_reserva_modalidad ?? "DIRECTO",
    condicionesVigenteDesde: r.condiciones_vigente_desde ?? r.fecha_ingreso,
    activo: !!r.activo,
  };
}

const SELECT_EMPLEADO = `
  SELECT e.*, r.codigo AS regimen_codigo,
         (SELECT MAX(h.vigente_desde) FROM historial_condiciones_nomina h WHERE h.empleado_id=e.id) AS condiciones_vigente_desde,
         c.nombre AS cargo_catalogo_nombre,
         c.estructura_ocupacional AS cargo_catalogo_estructura
  FROM empleados e
  JOIN regimenes r ON r.id = e.regimen_id
  LEFT JOIN cargos c ON c.id = e.cargo_id`;

export function listEmpleados(db: DB, opts: { soloActivos?: boolean; regimenId?: number } = {}): Empleado[] {
  const where: string[] = [];
  const args: unknown[] = [];
  if (opts.soloActivos) where.push("e.activo = 1");
  if (opts.regimenId) {
    where.push("e.regimen_id = ?");
    args.push(opts.regimenId);
  }
  const sql = `${SELECT_EMPLEADO} ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY e.apellidos, e.nombres`;
  return db.prepare(sql).all(...args).map(mapEmpleado);
}

export function getEmpleado(db: DB, id: number): Empleado | null {
  const r = db.prepare(`${SELECT_EMPLEADO} WHERE e.id = ?`).get(id);
  return r ? mapEmpleado(r) : null;
}

function empleadoParams(db: DB, e: EmpleadoInput) {
  const cargo = getCargo(db, e.cargoId);
  if (!cargo) throw new Error("El cargo seleccionado no existe");
  return {
    cedula: e.cedula,
    nombres: e.nombres,
    apellidos: e.apellidos,
    cargo: cargo.nombre,
    cargo_id: cargo.id,
    estructura_ocupacional: cargo.estructuraOcupacional,
    regimen_id: e.regimenId,
    sueldo_base_cent: e.sueldoBaseCent,
    fecha_ingreso: e.fechaIngreso,
    region: e.region,
    mensualiza_13: e.mensualiza13 ? 1 : 0,
    mensualiza_14: e.mensualiza14 ? 1 : 0,
    aplica_fondos_reserva: e.aplicaFondosReserva ? 1 : 0,
    fondos_reserva_modalidad: e.fondosReservaModalidad ?? "DIRECTO",
  };
}

function validarMinimoEmpleado(db: DB, e: EmpleadoInput, fecha: string): MinimoSalarial | null {
  const minimo = minimoSalarialCargo(db, e.cargoId, e.regimenId, fecha);
  if (!minimo) return null;
  if (minimo.tipoValor !== "MENSUAL") {
    throw new Error("La referencia del cargo es una tarifa y no puede validarse como sueldo mensual");
  }
  if (minimo.regla === "MINIMO" && e.sueldoBaseCent < minimo.minimoCent) {
    throw new Error(
      `El sueldo no puede ser inferior al mínimo de ${(minimo.minimoCent / 100).toFixed(2)} USD (${minimo.denominacion})`,
    );
  }
  if (minimo.regla === "FIJO" && e.sueldoBaseCent !== minimo.minimoCent) {
    throw new Error(
      `El sueldo debe coincidir con la RMU de ${(minimo.minimoCent / 100).toFixed(2)} USD (${minimo.denominacion})`,
    );
  }
  if (minimo.regla === "TECHO" && e.sueldoBaseCent > minimo.minimoCent) {
    throw new Error(
      `El sueldo no puede superar el techo de ${(minimo.minimoCent / 100).toFixed(2)} USD (${minimo.denominacion})`,
    );
  }
  return minimo;
}

function registrarSueldo(
  db: DB,
  empleadoId: number,
  sueldoCent: number,
  vigenteDesde: string,
  motivo: string,
  detalleEscalaId: number | null,
) {
  const vigente = db
    .prepare("SELECT * FROM historial_sueldos WHERE empleado_id = ? AND vigente_hasta IS NULL ORDER BY vigente_desde DESC LIMIT 1")
    .get(empleadoId) as any;
  if (vigente && vigenteDesde < vigente.vigente_desde) {
    throw new Error(`La vigencia del sueldo debe ser igual o posterior a ${vigente.vigente_desde}`);
  }
  if (vigente?.vigente_desde === vigenteDesde) {
    db.prepare(
      `UPDATE historial_sueldos
       SET sueldo_cent = ?, motivo = ?, detalle_escala_id = ? WHERE id = ?`,
    ).run(sueldoCent, motivo, detalleEscalaId, vigente.id);
    return;
  }
  if (vigente) {
    db.prepare("UPDATE historial_sueldos SET vigente_hasta = ? WHERE id = ?").run(diaAnterior(vigenteDesde), vigente.id);
  }
  db.prepare(
    `INSERT INTO historial_sueldos
      (empleado_id, sueldo_cent, vigente_desde, vigente_hasta, motivo, detalle_escala_id)
     VALUES (?, ?, ?, NULL, ?, ?)`,
  ).run(empleadoId, sueldoCent, vigenteDesde, motivo, detalleEscalaId);
}

export function crearEmpleado(db: DB, e: EmpleadoInput): number {
  return db.transaction(() => {
    const vigenteDesde = e.sueldoVigenteDesde ?? e.fechaIngreso;
    const minimo = validarMinimoEmpleado(db, e, vigenteDesde);
    const info = db
      .prepare(
        `INSERT INTO empleados (cedula, nombres, apellidos, cargo, cargo_id, estructura_ocupacional, regimen_id, sueldo_base_cent, fecha_ingreso, region,
           mensualiza_13, mensualiza_14, aplica_fondos_reserva, fondos_reserva_modalidad, activo)
         VALUES (@cedula, @nombres, @apellidos, @cargo, @cargo_id, @estructura_ocupacional, @regimen_id, @sueldo_base_cent, @fecha_ingreso, @region,
           @mensualiza_13, @mensualiza_14, @aplica_fondos_reserva, @fondos_reserva_modalidad, 1)`,
      )
      .run(empleadoParams(db, e));
    const id = Number(info.lastInsertRowid);
    registrarCondicionesNomina(db, id, e, e.fechaIngreso);
    registrarSueldo(
      db,
      id,
      e.sueldoBaseCent,
      vigenteDesde,
      e.motivoCambioSueldo?.trim() || "Sueldo de ingreso",
      minimo?.detalleId ?? null,
    );
    return id;
  })();
}

export function actualizarEmpleado(db: DB, id: number, e: EmpleadoInput) {
  db.transaction(() => {
    const anterior = getEmpleado(db, id);
    if (!anterior) throw new Error("Empleado no encontrado");
    const vigenteDesde = e.sueldoVigenteDesde ?? e.fechaIngreso;
    const minimo = validarMinimoEmpleado(db, e, vigenteDesde);
    const cambiaCondicion = anterior.regimenId !== e.regimenId || anterior.mensualiza13 !== e.mensualiza13 ||
      anterior.mensualiza14 !== e.mensualiza14 || anterior.aplicaFondosReserva !== e.aplicaFondosReserva ||
      anterior.fondosReservaModalidad !== (e.fondosReservaModalidad ?? "DIRECTO") || anterior.region !== e.region;
    if (cambiaCondicion) {
      const fecha = e.condicionesVigenteDesde ?? vigenteDesde;
      if (fecha < (anterior.condicionesVigenteDesde ?? anterior.fechaIngreso)) throw new Error("La vigencia de las condiciones no puede ser anterior a su último cambio");
      if (db.prepare("SELECT 1 FROM roles_pago WHERE empleado_id=? AND periodo>=? LIMIT 1").get(id, fecha.slice(0, 7))) {
        throw new Error("Ya existen roles guardados desde esa vigencia. Use un periodo posterior para cambiar las condiciones de pago.");
      }
      registrarCondicionesNomina(db, id, e, fecha);
    }
    db.prepare(
      `UPDATE empleados SET cedula=@cedula, nombres=@nombres, apellidos=@apellidos, cargo=@cargo, cargo_id=@cargo_id,
         estructura_ocupacional=@estructura_ocupacional, regimen_id=@regimen_id,
         sueldo_base_cent=@sueldo_base_cent, fecha_ingreso=@fecha_ingreso, region=@region, mensualiza_13=@mensualiza_13,
         mensualiza_14=@mensualiza_14, aplica_fondos_reserva=@aplica_fondos_reserva, fondos_reserva_modalidad=@fondos_reserva_modalidad
       WHERE id=@id`,
    ).run({ ...empleadoParams(db, e), id });
    if (anterior.sueldoBaseCent !== e.sueldoBaseCent) {
      registrarSueldo(
        db,
        id,
        e.sueldoBaseCent,
        vigenteDesde,
        e.motivoCambioSueldo?.trim() || "Actualización salarial",
        minimo?.detalleId ?? null,
      );
    }
  })();
}

function registrarCondicionesNomina(db: DB, empleadoId: number, e: EmpleadoInput, fecha: string) {
  db.prepare(`INSERT INTO historial_condiciones_nomina
    (empleado_id, vigente_desde, regimen_id, mensualiza_13, mensualiza_14, aplica_fondos_reserva, fondos_reserva_modalidad, region)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (empleado_id, vigente_desde) DO UPDATE SET regimen_id=excluded.regimen_id,
    mensualiza_13=excluded.mensualiza_13, mensualiza_14=excluded.mensualiza_14,
    aplica_fondos_reserva=excluded.aplica_fondos_reserva, fondos_reserva_modalidad=excluded.fondos_reserva_modalidad, region=excluded.region`)
    .run(empleadoId, fecha, e.regimenId, Number(e.mensualiza13), Number(e.mensualiza14), Number(e.aplicaFondosReserva), e.fondosReservaModalidad ?? "DIRECTO", e.region);
}

export function condicionesEmpleadoVigentes(db: DB, e: Empleado, fecha: string): Empleado {
  const h = db.prepare(`SELECT h.*, r.codigo FROM historial_condiciones_nomina h JOIN regimenes r ON r.id=h.regimen_id
    WHERE h.empleado_id=? AND h.vigente_desde<=? ORDER BY h.vigente_desde DESC LIMIT 1`).get(e.id, fecha) as any;
  return h ? { ...e, regimenId: h.regimen_id, regimenCodigo: h.codigo, mensualiza13: !!h.mensualiza_13,
    mensualiza14: !!h.mensualiza_14, aplicaFondosReserva: !!h.aplica_fondos_reserva,
    fondosReservaModalidad: h.fondos_reserva_modalidad, region: h.region } : e;
}

export function setEmpleadoActivo(db: DB, id: number, activo: boolean) {
  db.prepare("UPDATE empleados SET activo = ? WHERE id = ?").run(activo ? 1 : 0, id);
}

export function listHistorialSueldos(db: DB): HistorialSueldo[] {
  return (db.prepare("SELECT * FROM historial_sueldos ORDER BY empleado_id, vigente_desde DESC").all() as any[]).map((r) => ({
    id: r.id,
    empleadoId: r.empleado_id,
    sueldoCent: r.sueldo_cent,
    vigenteDesde: r.vigente_desde,
    vigenteHasta: r.vigente_hasta,
    motivo: r.motivo,
  }));
}

export function sueldoEmpleadoVigente(db: DB, empleadoId: number, fecha: string): number | null {
  const row = db
    .prepare(
      `SELECT sueldo_cent FROM historial_sueldos
       WHERE empleado_id = ? AND vigente_desde <= ? AND (vigente_hasta IS NULL OR vigente_hasta >= ?)
       ORDER BY vigente_desde DESC LIMIT 1`,
    )
    .get(empleadoId, fecha, fecha) as { sueldo_cent: number } | undefined;
  return row?.sueldo_cent ?? null;
}

export interface IncumplimientoSalarial {
  empleadoId: number;
  empleado: string;
  cargo: string;
  regimenCodigo: string;
  sueldoCent: number;
  minimoCent: number;
  denominacion: string;
  regla: ReglaValorEscala;
}

export function listIncumplimientosSalariales(db: DB, fecha: string): IncumplimientoSalarial[] {
  const empleados = listEmpleados(db, { soloActivos: true });
  const resultado: IncumplimientoSalarial[] = [];
  for (const empleado of empleados) {
    if (!empleado.cargoId) continue;
    const minimo = minimoSalarialCargo(db, empleado.cargoId, empleado.regimenId, fecha);
    if (!minimo || minimo.tipoValor !== "MENSUAL" || minimo.regla === "REFERENCIA") continue;
    const incumple =
      (minimo.regla === "MINIMO" && empleado.sueldoBaseCent < minimo.minimoCent) ||
      (minimo.regla === "FIJO" && empleado.sueldoBaseCent !== minimo.minimoCent) ||
      (minimo.regla === "TECHO" && empleado.sueldoBaseCent > minimo.minimoCent);
    if (!incumple) continue;
    resultado.push({
      empleadoId: empleado.id,
      empleado: `${empleado.apellidos} ${empleado.nombres}`,
      cargo: empleado.cargo,
      regimenCodigo: empleado.regimenCodigo,
      sueldoCent: empleado.sueldoBaseCent,
      minimoCent: minimo.minimoCent,
      denominacion: minimo.denominacion,
      regla: minimo.regla,
    });
  }
  return resultado;
}

// ---------------------------------------------------------------- Parámetros

function mapParametro(r: any): Parametro {
  return {
    id: r.id,
    regimenId: r.regimen_id,
    clave: r.clave,
    valor: r.valor,
    tipo: r.tipo,
    descripcion: r.descripcion,
    vigenteDesde: r.vigente_desde,
    vigenteHasta: r.vigente_hasta,
  };
}

/** Último registro (abierto) de cada parámetro. */
export function listParametrosActuales(db: DB): Parametro[] {
  return db
    .prepare("SELECT * FROM parametros WHERE vigente_hasta IS NULL ORDER BY regimen_id, id")
    .all()
    .map(mapParametro);
}

export function historialParametro(db: DB, clave: string, regimenId: number | null): Parametro[] {
  return db
    .prepare("SELECT * FROM parametros WHERE clave = ? AND regimen_id IS ? ORDER BY vigente_desde DESC")
    .all(clave, regimenId)
    .map(mapParametro);
}

export function listTodosParametros(db: DB): Parametro[] {
  return db.prepare("SELECT * FROM parametros ORDER BY clave, regimen_id, vigente_desde DESC").all().map(mapParametro);
}

/**
 * Valores vigentes en la fecha indicada: primero los globales y luego los del
 * régimen (que prevalecen si una clave existe en ambos ámbitos).
 */
export function parametrosVigentes(db: DB, regimenId: number, fecha: string): Record<string, string> {
  const rows = db
    .prepare(
      `SELECT clave, valor, regimen_id FROM parametros
       WHERE (regimen_id IS NULL OR regimen_id = ?)
         AND vigente_desde <= ? AND (vigente_hasta IS NULL OR vigente_hasta >= ?)
       ORDER BY CASE WHEN regimen_id IS NULL THEN 0 ELSE 1 END`,
    )
    .all(regimenId, fecha, fecha) as { clave: string; valor: string }[];
  const out: Record<string, string> = {};
  for (const r of rows) out[r.clave] = r.valor;
  return out;
}

export function parametroGlobal(db: DB, clave: string, fecha: string): string | null {
  const r = db
    .prepare(
      `SELECT valor FROM parametros WHERE regimen_id IS NULL AND clave = ?
         AND vigente_desde <= ? AND (vigente_hasta IS NULL OR vigente_hasta >= ?)
       ORDER BY vigente_desde DESC LIMIT 1`,
    )
    .get(clave, fecha, fecha) as { valor: string } | undefined;
  return r?.valor ?? null;
}

export function validarValorParametro(tipo: TipoParametro, valor: string): string {
  const v = valor.trim();
  if (tipo === "texto") {
    if (!v) throw new Error("El valor no puede estar vacío");
    return v;
  }
  let scaled: bigint;
  try {
    scaled = parseScaled(v, 2);
  } catch {
    throw new Error("Ingrese un número válido (use punto decimal)");
  }
  if (scaled < 0n) throw new Error("El valor no puede ser negativo");
  if (tipo === "porcentaje" && scaled > 10000n) throw new Error("El porcentaje no puede superar 100");
  // Normaliza a 2 decimales para almacenar texto exacto
  const s = scaled.toString().padStart(3, "0");
  return `${s.slice(0, -2)}.${s.slice(-2)}`;
}

/**
 * Edita un parámetro conservando historial:
 * - Si la nueva vigencia es igual a la del registro actual, se corrige el valor.
 * - Si es posterior, se cierra el registro actual (vigente_hasta = día anterior)
 *   y se inserta uno nuevo. Así los periodos anteriores siguen usando el valor viejo.
 */
export function actualizarParametro(db: DB, id: number, valor: string, vigenteDesde: string) {
  const actual = db.prepare("SELECT * FROM parametros WHERE id = ?").get(id);
  if (!actual) throw new Error("Parámetro no encontrado");
  const p = mapParametro(actual);
  if (p.vigenteHasta) throw new Error("Solo se puede editar el registro vigente del parámetro");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(vigenteDesde)) throw new Error("Fecha de vigencia inválida");
  const limpio = validarValorParametro(p.tipo, valor);

  if (vigenteDesde < p.vigenteDesde) {
    throw new Error(`La nueva vigencia debe ser igual o posterior a ${p.vigenteDesde}`);
  }
  const tx = db.transaction(() => {
    if (vigenteDesde === p.vigenteDesde) {
      db.prepare("UPDATE parametros SET valor = ? WHERE id = ?").run(limpio, id);
    } else {
      db.prepare("UPDATE parametros SET vigente_hasta = ? WHERE id = ?").run(diaAnterior(vigenteDesde), id);
      db.prepare(
        `INSERT INTO parametros (regimen_id, clave, valor, tipo, descripcion, vigente_desde, vigente_hasta)
         VALUES (?, ?, ?, ?, ?, ?, NULL)`,
      ).run(p.regimenId, p.clave, limpio, p.tipo, p.descripcion, vigenteDesde);
    }
  });
  tx();
}

// ---------------------------------------------------------------- Novedades

function mapNovedad(r: any): Novedad {
  return {
    empleadoId: r.empleado_id,
    periodo: r.periodo,
    horasNocturnas: r.horas_nocturnas,
    horasSuplementarias: r.horas_suplementarias,
    horasExtraordinarias: r.horas_extraordinarias,
    otrosIngresosCent: r.otros_ingresos_cent,
    descuentosCent: r.descuentos_cent,
    descuentosDetalle: r.descuentos_detalle_json == null ? undefined : resolverDescuentos(0, JSON.parse(r.descuentos_detalle_json)),
    impuestoRentaCent: r.impuesto_renta_cent ?? 0,
    pagoDecimoTerceroCent: r.pago_decimo_tercero_cent ?? 0,
    pagoDecimoCuartoCent: r.pago_decimo_cuarto_cent ?? 0,
    observacion: r.observacion,
  };
}

export function listNovedades(db: DB, periodo: string): Map<number, Novedad> {
  const rows = db.prepare("SELECT * FROM novedades WHERE periodo = ?").all(periodo).map(mapNovedad);
  return new Map(rows.map((n) => [n.empleadoId, n]));
}

export function guardarNovedades(db: DB, periodo: string, novedades: Omit<Novedad, "periodo">[]) {
  const stmt = db.prepare(
    `INSERT INTO novedades (empleado_id, periodo, horas_nocturnas, horas_suplementarias, horas_extraordinarias,
       otros_ingresos_cent, descuentos_cent, observacion, impuesto_renta_cent, pago_decimo_tercero_cent, pago_decimo_cuarto_cent, descuentos_detalle_json)
     VALUES (@empleadoId, @periodo, @horasNocturnas, @horasSuplementarias, @horasExtraordinarias,
       @otrosIngresosCent, @descuentosCent, @observacion, @impuestoRentaCent, @pagoDecimoTerceroCent, @pagoDecimoCuartoCent, @descuentosDetalleJson)
     ON CONFLICT (empleado_id, periodo) DO UPDATE SET
       horas_nocturnas = excluded.horas_nocturnas,
       horas_suplementarias = excluded.horas_suplementarias,
       horas_extraordinarias = excluded.horas_extraordinarias,
       otros_ingresos_cent = excluded.otros_ingresos_cent,
       descuentos_cent = excluded.descuentos_cent,
       descuentos_detalle_json = excluded.descuentos_detalle_json,
       observacion = excluded.observacion, impuesto_renta_cent=excluded.impuesto_renta_cent,
       pago_decimo_tercero_cent=excluded.pago_decimo_tercero_cent, pago_decimo_cuarto_cent=excluded.pago_decimo_cuarto_cent`,
  );
  db.transaction(() => {
    for (const n of novedades) {
      const detalle = resolverDescuentos(n.descuentosCent, n.descuentosDetalle);
      stmt.run({ impuestoRentaCent: 0, pagoDecimoTerceroCent: 0, pagoDecimoCuartoCent: 0, ...n, periodo,
        descuentosCent: totalDescuentos(detalle),
        descuentosDetalleJson: n.descuentosDetalle === undefined ? null : JSON.stringify(detalle) });
    }
  })();
}

/** Periodos que tienen novedades registradas (más recientes primero). */
export function periodosConNovedades(db: DB): string[] {
  return (db.prepare("SELECT DISTINCT periodo FROM novedades ORDER BY periodo DESC").all() as { periodo: string }[]).map(
    (r) => r.periodo,
  );
}

// ---------------------------------------------------------------- Empresa

export interface DatosEmpresa {
  razonSocial: string;
  nombreComercial: string;
  ruc: string;
  direccion: string;
  telefono: string;
  email: string;
  representanteLegal: string;
  mostrarNombreConLogo: boolean;
}

export interface Empresa extends DatosEmpresa {
  logoPersonalizado: boolean;
  /** Cambia cada vez que se reemplaza el logo; sirve para invalidar la caché del navegador. */
  logoVersion: string;
}

export interface LogoPng {
  png: Buffer;
  ancho: number;
  alto: number;
}

export function obtenerEmpresa(db: DB): Empresa {
  const r = db
    .prepare(
      `SELECT razon_social, nombre_comercial, ruc, direccion, telefono, email, representante_legal,
              mostrar_nombre_con_logo, logo_png IS NOT NULL AS logo_personalizado, logo_actualizado_en
       FROM empresa WHERE id = 1`,
    )
    .get() as any;
  return {
    razonSocial: r?.razon_social ?? "Mi empresa",
    nombreComercial: r?.nombre_comercial ?? "",
    ruc: r?.ruc ?? "",
    direccion: r?.direccion ?? "",
    telefono: r?.telefono ?? "",
    email: r?.email ?? "",
    representanteLegal: r?.representante_legal ?? "",
    mostrarNombreConLogo: r ? !!r.mostrar_nombre_con_logo : true,
    logoPersonalizado: !!r?.logo_personalizado,
    logoVersion: r?.logo_actualizado_en ?? "generico",
  };
}

/** Nombre corto para la interfaz: el comercial si existe, si no la razón social. */
export function nombreVisibleEmpresa(empresa: Pick<Empresa, "razonSocial" | "nombreComercial">) {
  return empresa.nombreComercial || empresa.razonSocial;
}

export function guardarEmpresa(db: DB, datos: DatosEmpresa) {
  db.prepare(
    `INSERT INTO empresa (id, razon_social, nombre_comercial, ruc, direccion, telefono, email, representante_legal, mostrar_nombre_con_logo)
     VALUES (1, @razonSocial, @nombreComercial, @ruc, @direccion, @telefono, @email, @representanteLegal, @mostrar)
     ON CONFLICT (id) DO UPDATE SET
       razon_social = excluded.razon_social,
       nombre_comercial = excluded.nombre_comercial,
       ruc = excluded.ruc,
       direccion = excluded.direccion,
       telefono = excluded.telefono,
       email = excluded.email,
       representante_legal = excluded.representante_legal,
       mostrar_nombre_con_logo = excluded.mostrar_nombre_con_logo`,
  ).run({ ...datos, mostrar: datos.mostrarNombreConLogo ? 1 : 0 });
}

/** Logo cargado por el usuario, o null si se usa el genérico. */
export function obtenerLogoEmpresa(db: DB): LogoPng | null {
  const r = db.prepare("SELECT logo_png, logo_ancho, logo_alto FROM empresa WHERE id = 1").get() as
    | { logo_png: Buffer | null; logo_ancho: number | null; logo_alto: number | null }
    | undefined;
  if (!r?.logo_png || !r.logo_ancho || !r.logo_alto) return null;
  return { png: r.logo_png, ancho: r.logo_ancho, alto: r.logo_alto };
}

export function guardarLogoEmpresa(db: DB, logo: LogoPng | null) {
  db.prepare(
    "UPDATE empresa SET logo_png = ?, logo_ancho = ?, logo_alto = ?, logo_actualizado_en = ? WHERE id = 1",
  ).run(logo?.png ?? null, logo?.ancho ?? null, logo?.alto ?? null, logo ? new Date().toISOString() : null);
}

// ---------------------------------------------------------------- Vigencia helper

export function fechaVigencia(periodo: string) {
  return inicioPeriodo(periodo);
}
/* eslint-enable @typescript-eslint/no-explicit-any */
