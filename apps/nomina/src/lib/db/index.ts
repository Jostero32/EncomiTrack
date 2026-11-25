import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { migrarNominaDetallada } from "./nomina-detallada";
import {
  CATALOGO_SECTORIAL_SOFTWARE_2025,
  FUENTE_CATALOGO_SECTORIAL_2025,
} from "../catalogo-sectorial-2025";
import {
  ESCALA_NACIONAL_LOSEP,
  FUENTE_DIRECTRICES_LOEP,
  FUENTE_ESCALA_LOSEP,
  PLANTILLA_ESCALA_LOEP,
} from "../catalogo-publico";

export const DB_PATH = path.join(process.cwd(), "data", "nomina.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS migraciones (
  clave TEXT PRIMARY KEY,
  aplicada_en TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS regimenes (
  id INTEGER PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS parametros (
  id INTEGER PRIMARY KEY,
  regimen_id INTEGER NULL REFERENCES regimenes(id),
  clave TEXT NOT NULL,
  valor TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('porcentaje','moneda','numero','texto')),
  descripcion TEXT NOT NULL DEFAULT '',
  vigente_desde TEXT NOT NULL,
  vigente_hasta TEXT NULL
);
CREATE INDEX IF NOT EXISTS ix_parametros_clave ON parametros(clave, regimen_id, vigente_desde);

CREATE TABLE IF NOT EXISTS cargos (
  id INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL COLLATE NOCASE UNIQUE,
  estructura_ocupacional TEXT NULL CHECK (estructura_ocupacional IN ('A1','B1','B2','B3','C1','C2','C3','D1','D2','E1','E2')),
  descripcion TEXT NOT NULL DEFAULT '',
  activo INTEGER NOT NULL DEFAULT 1,
  -- Jerarquía por puesto: el árbol se mantiene aunque cambie quién ocupa el cargo.
  reporta_a_id INTEGER NULL REFERENCES cargos(id)
);

CREATE TABLE IF NOT EXISTS empleados (
  id INTEGER PRIMARY KEY,
  cedula TEXT NOT NULL UNIQUE,
  nombres TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  cargo TEXT NOT NULL DEFAULT '',
  cargo_id INTEGER NULL REFERENCES cargos(id),
  estructura_ocupacional TEXT NULL CHECK (estructura_ocupacional IN ('A1','B1','B2','B3','C1','C2','C3','D1','D2','E1','E2')),
  regimen_id INTEGER NOT NULL REFERENCES regimenes(id),
  sueldo_base_cent INTEGER NOT NULL CHECK (sueldo_base_cent >= 0),
  fecha_ingreso TEXT NOT NULL,
  region TEXT NOT NULL CHECK (region IN ('SIERRA_ORIENTE','COSTA_GALAPAGOS')),
  mensualiza_13 INTEGER NOT NULL DEFAULT 1,
  mensualiza_14 INTEGER NOT NULL DEFAULT 1,
  aplica_fondos_reserva INTEGER NOT NULL DEFAULT 1,
  activo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS escalas_salariales (
  id INTEGER PRIMARY KEY,
  regimen_id INTEGER NOT NULL REFERENCES regimenes(id),
  nombre TEXT NOT NULL,
  anio INTEGER NOT NULL CHECK (anio BETWEEN 2000 AND 2200),
  vigente_desde TEXT NOT NULL,
  vigente_hasta TEXT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('BORRADOR','TRANSITORIA','OFICIAL','REFERENCIAL')),
  referencia_legal TEXT NOT NULL DEFAULT '',
  fuente_url TEXT NOT NULL DEFAULT '',
  observacion TEXT NOT NULL DEFAULT '',
  UNIQUE (regimen_id, nombre, vigente_desde)
);
CREATE INDEX IF NOT EXISTS ix_escalas_vigencia ON escalas_salariales(regimen_id, vigente_desde, vigente_hasta);

CREATE TABLE IF NOT EXISTS escala_salarial_detalles (
  id INTEGER PRIMARY KEY,
  escala_id INTEGER NOT NULL REFERENCES escalas_salariales(id),
  codigo_referencia TEXT NOT NULL,
  denominacion TEXT NOT NULL,
  comision TEXT NOT NULL DEFAULT '',
  rama TEXT NOT NULL DEFAULT '',
  estructura_ocupacional TEXT NULL CHECK (estructura_ocupacional IN ('A1','B1','B2','B3','C1','C2','C3','D1','D2','E1','E2')),
  minimo_cent INTEGER NOT NULL CHECK (minimo_cent >= 0),
  tipo_valor TEXT NOT NULL DEFAULT 'MENSUAL' CHECK (tipo_valor IN ('MENSUAL','TARIFA')),
  regla TEXT NOT NULL DEFAULT 'MINIMO' CHECK (regla IN ('MINIMO','FIJO','TECHO','REFERENCIA')),
  UNIQUE (escala_id, codigo_referencia)
);
CREATE INDEX IF NOT EXISTS ix_detalles_escala_codigo ON escala_salarial_detalles(codigo_referencia, escala_id);

-- La relación usa un código estable, no el id de una fila anual. De esta
-- forma, una nueva versión de la escala se aplica al cargo sin reasignarlo.
CREATE TABLE IF NOT EXISTS cargo_escalas (
  cargo_id INTEGER NOT NULL REFERENCES cargos(id),
  regimen_id INTEGER NOT NULL REFERENCES regimenes(id),
  codigo_referencia TEXT NOT NULL,
  PRIMARY KEY (cargo_id, regimen_id)
);

CREATE TABLE IF NOT EXISTS historial_sueldos (
  id INTEGER PRIMARY KEY,
  empleado_id INTEGER NOT NULL REFERENCES empleados(id),
  sueldo_cent INTEGER NOT NULL CHECK (sueldo_cent >= 0),
  vigente_desde TEXT NOT NULL,
  vigente_hasta TEXT NULL,
  motivo TEXT NOT NULL DEFAULT '',
  detalle_escala_id INTEGER NULL REFERENCES escala_salarial_detalles(id),
  UNIQUE (empleado_id, vigente_desde)
);
CREATE INDEX IF NOT EXISTS ix_historial_sueldos_vigencia ON historial_sueldos(empleado_id, vigente_desde, vigente_hasta);

CREATE TABLE IF NOT EXISTS novedades (
  id INTEGER PRIMARY KEY,
  empleado_id INTEGER NOT NULL REFERENCES empleados(id),
  periodo TEXT NOT NULL,
  horas_nocturnas REAL NOT NULL DEFAULT 0,
  horas_suplementarias REAL NOT NULL DEFAULT 0,
  horas_extraordinarias REAL NOT NULL DEFAULT 0,
  otros_ingresos_cent INTEGER NOT NULL DEFAULT 0,
  descuentos_cent INTEGER NOT NULL DEFAULT 0,
  observacion TEXT NOT NULL DEFAULT '',
  UNIQUE (empleado_id, periodo)
);

CREATE TABLE IF NOT EXISTS roles_pago (
  id INTEGER PRIMARY KEY,
  empleado_id INTEGER NOT NULL REFERENCES empleados(id),
  periodo TEXT NOT NULL,
  ingresos_cent INTEGER NOT NULL,
  egresos_cent INTEGER NOT NULL,
  neto_cent INTEGER NOT NULL,
  detalle_json TEXT NOT NULL,
  generado_en TEXT NOT NULL,
  UNIQUE (empleado_id, periodo)
);

CREATE TABLE IF NOT EXISTS provisiones (
  id INTEGER PRIMARY KEY,
  empleado_id INTEGER NOT NULL REFERENCES empleados(id),
  periodo TEXT NOT NULL,
  decimo_tercero_cent INTEGER NOT NULL DEFAULT 0,
  decimo_cuarto_cent INTEGER NOT NULL DEFAULT 0,
  fondos_reserva_cent INTEGER NOT NULL DEFAULT 0,
  aporte_patronal_cent INTEGER NOT NULL DEFAULT 0,
  UNIQUE (empleado_id, periodo)
);

-- Datos institucionales (una sola fila). El logo se guarda normalizado a PNG
-- para usarlo igual en la interfaz, los PDF y el Excel.
CREATE TABLE IF NOT EXISTS empresa (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  razon_social TEXT NOT NULL,
  nombre_comercial TEXT NOT NULL DEFAULT '',
  ruc TEXT NOT NULL DEFAULT '',
  direccion TEXT NOT NULL DEFAULT '',
  telefono TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  representante_legal TEXT NOT NULL DEFAULT '',
  mostrar_nombre_con_logo INTEGER NOT NULL DEFAULT 1,
  logo_png BLOB NULL,
  logo_ancho INTEGER NULL,
  logo_alto INTEGER NULL,
  logo_actualizado_en TEXT NULL
);

INSERT OR IGNORE INTO regimenes (id, codigo, nombre) VALUES
  (1, 'CT', 'Código de Trabajo'),
  (2, 'LOSEP', 'LOSEP (sector público)'),
  (3, 'LOEP', 'LOEP (empresas públicas)');
`;

/** Migración idempotente. */
export function migrate(db: Database.Database) {
  db.exec(SCHEMA);
  const columnas = db.prepare("PRAGMA table_info(empleados)").all() as { name: string }[];
  if (!columnas.some((columna) => columna.name === "estructura_ocupacional")) {
    // Los empleados existentes quedan pendientes de clasificación: no se debe
    // inferir el nivel legal únicamente a partir del nombre libre del cargo.
    db.exec(
      "ALTER TABLE empleados ADD COLUMN estructura_ocupacional TEXT NULL CHECK (estructura_ocupacional IN ('A1','B1','B2','B3','C1','C2','C3','D1','D2','E1','E2'))",
    );
  }
  if (!columnas.some((columna) => columna.name === "cargo_id")) {
    db.exec("ALTER TABLE empleados ADD COLUMN cargo_id INTEGER NULL REFERENCES cargos(id)");
  }
  const columnasCargo = db.prepare("PRAGMA table_info(cargos)").all() as { name: string }[];
  if (!columnasCargo.some((columna) => columna.name === "reporta_a_id")) {
    db.exec("ALTER TABLE cargos ADD COLUMN reporta_a_id INTEGER NULL REFERENCES cargos(id)");
  }
  const columnasDetalle = db.prepare("PRAGMA table_info(escala_salarial_detalles)").all() as { name: string }[];
  if (!columnasDetalle.some((columna) => columna.name === "regla")) {
    db.exec(
      "ALTER TABLE escala_salarial_detalles ADD COLUMN regla TEXT NOT NULL DEFAULT 'MINIMO' CHECK (regla IN ('MINIMO','FIJO','TECHO','REFERENCIA'))",
    );
  }

  // Nombre y RUC eran parámetros globales versionados; pasan a la ficha de la
  // empresa porque no intervienen en el cálculo de la nómina.
  if (!db.prepare("SELECT 1 FROM empresa WHERE id = 1").get()) {
    const parametroEmpresa = (clave: string) =>
      (
        db
          .prepare(
            "SELECT valor FROM parametros WHERE regimen_id IS NULL AND clave = ? ORDER BY vigente_desde DESC LIMIT 1",
          )
          .get(clave) as { valor: string } | undefined
      )?.valor ?? "";
    db.prepare("INSERT INTO empresa (id, razon_social, ruc) VALUES (1, ?, ?)").run(
      parametroEmpresa("empresa_nombre") || "Mi empresa",
      parametroEmpresa("empresa_ruc"),
    );
  }
  db.exec("DELETE FROM parametros WHERE regimen_id IS NULL AND clave IN ('empresa_nombre', 'empresa_ruc')");

  // Convierte los textos libres existentes en un catálogo sin inventar su
  // estructura. Los cargos sin clasificación quedan visibles para revisión.
  db.exec(`
    INSERT OR IGNORE INTO cargos (nombre, estructura_ocupacional, descripcion, activo)
    SELECT TRIM(cargo), MAX(estructura_ocupacional), 'Migrado desde el registro de empleados', 1
    FROM empleados
    WHERE TRIM(cargo) <> ''
    GROUP BY LOWER(TRIM(cargo));

    UPDATE empleados
    SET cargo_id = (
      SELECT c.id FROM cargos c
      WHERE c.nombre = TRIM(empleados.cargo) COLLATE NOCASE
      LIMIT 1
    )
    WHERE cargo_id IS NULL AND TRIM(cargo) <> '';
  `);

  // Catálogo oficial relevante para una empresa de software: puestos TIC y
  // cargos administrativos, profesionales, de seguridad y servicios de apoyo.
  // Se conserva 2025 como base histórica y el resolver aplica en 2026 el mayor
  // entre esta fila sectorial y el nuevo SBU.
  db.prepare(
    `INSERT OR IGNORE INTO escalas_salariales
      (regimen_id, nombre, anio, vigente_desde, vigente_hasta, estado, referencia_legal, fuente_url, observacion)
     VALUES (1, ?, 2025, '2025-01-01', '2025-12-31', 'OFICIAL', 'Acuerdo Ministerial MDT-2024-301', ?, ?)`,
  ).run(
    "Catálogo sectorial 2025 · Empresa de software",
    FUENTE_CATALOGO_SECTORIAL_2025,
    "Comisiones 12 (TIC, excepto telefonía móvil) y 19 (administración, profesionales, seguridad y servicios técnicos).",
  );
  const escalaSectorial = db
    .prepare(
      `SELECT id FROM escalas_salariales
       WHERE regimen_id = 1 AND nombre = ? AND vigente_desde = '2025-01-01'`,
    )
    .get("Catálogo sectorial 2025 · Empresa de software") as { id: number };
  const insertarFilaSectorial = db.prepare(
    `INSERT OR IGNORE INTO escala_salarial_detalles
      (escala_id, codigo_referencia, denominacion, comision, rama, estructura_ocupacional, minimo_cent, tipo_valor)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'MENSUAL')`,
  );
  db.transaction(() => {
    for (const fila of CATALOGO_SECTORIAL_SOFTWARE_2025) {
      insertarFilaSectorial.run(
        escalaSectorial.id,
        fila.codigo,
        fila.denominacion,
        fila.comision,
        fila.rama,
        fila.estructura,
        fila.minimoCent,
      );
    }
  })();

  // LOSEP sí dispone de una escala nacional: grupo ocupacional, grado y RMU.
  // Se carga completa para que el cargo se vincule al grado y no a un sueldo
  // escrito libremente en cada empleado.
  db.prepare(
    `INSERT OR IGNORE INTO escalas_salariales
      (regimen_id, nombre, anio, vigente_desde, vigente_hasta, estado, referencia_legal, fuente_url, observacion)
     VALUES (2, ?, 2017, '2017-10-17', NULL, 'OFICIAL', 'Acuerdo Ministerial MDT-2017-0154', ?, ?)`,
  ).run(
    "Escala nacional LOSEP · 20 grados",
    FUENTE_ESCALA_LOSEP,
    "Escala nacional de RMU. La clasificación del puesto debe sustentarse en el manual institucional aprobado.",
  );
  const escalaLosep = db
    .prepare("SELECT id FROM escalas_salariales WHERE regimen_id = 2 AND nombre = ? AND vigente_desde = '2017-10-17'")
    .get("Escala nacional LOSEP · 20 grados") as { id: number };
  const insertarFilaLosep = db.prepare(
    `INSERT OR IGNORE INTO escala_salarial_detalles
      (escala_id, codigo_referencia, denominacion, comision, rama, estructura_ocupacional, minimo_cent, tipo_valor, regla)
     VALUES (?, ?, ?, 'Escala nacional LOSEP', ?, NULL, ?, 'MENSUAL', 'FIJO')`,
  );
  db.transaction(() => {
    for (const [codigo, denominacion, grado, rmuCent] of ESCALA_NACIONAL_LOSEP) {
      insertarFilaLosep.run(escalaLosep.id, codigo, denominacion, `Grado ${grado}`, rmuCent);
    }
  })();

  // Para procesos adjetivos y gobernantes de empresas públicas, MDT-2024-039
  // ordena acogerse a la escala nacional. Se separan los códigos de LOSEP para
  // que cada régimen pueda versionarse sin alterar los vínculos del otro.
  db.prepare(
    `INSERT OR IGNORE INTO escalas_salariales
      (regimen_id, nombre, anio, vigente_desde, vigente_hasta, estado, referencia_legal, fuente_url, observacion)
     VALUES (3, ?, 2024, '2024-03-17', NULL, 'OFICIAL', 'Acuerdo Ministerial MDT-2024-039, artículo 4', ?, ?)`,
  ).run(
    "LOEP · Procesos gobernantes y adjetivos",
    FUENTE_DIRECTRICES_LOEP,
    "Para puestos no comprendidos en el nivel jerárquico superior. El Directorio debe clasificar el puesto y emitir el acto normativo correspondiente.",
  );
  const escalaLoepPublica = db
    .prepare("SELECT id FROM escalas_salariales WHERE regimen_id = 3 AND nombre = ? AND vigente_desde = '2024-03-17'")
    .get("LOEP · Procesos gobernantes y adjetivos") as { id: number };
  const insertarFilaLoepPublica = db.prepare(
    `INSERT OR IGNORE INTO escala_salarial_detalles
      (escala_id, codigo_referencia, denominacion, comision, rama, estructura_ocupacional, minimo_cent, tipo_valor, regla)
     VALUES (?, ?, ?, 'Procesos gobernantes y adjetivos', ?, NULL, ?, 'MENSUAL', 'FIJO')`,
  );
  db.transaction(() => {
    for (const [codigoLosep, denominacion, grado, rmuCent] of ESCALA_NACIONAL_LOSEP) {
      insertarFilaLoepPublica.run(
        escalaLoepPublica.id,
        codigoLosep.replace("LOSEP-", "LOEP-PUBLICO-"),
        denominacion,
        `Grado ${grado}`,
        rmuCent,
      );
    }
  })();

  // Los procesos sustantivos no tienen una RMU universal por cargo. Se ofrece
  // una plantilla editable y sin valores inventados; REFERENCIA con valor cero
  // no bloquea empleados hasta que la empresa cargue su escala institucional.
  db.exec(`
    UPDATE escalas_salariales
    SET nombre = 'LOEP · Procesos sustantivos configurables'
    WHERE regimen_id = 3
      AND nombre = 'Plantilla institucional LOEP · Configurable'
      AND NOT EXISTS (
        SELECT 1 FROM escalas_salariales nueva
        WHERE nueva.regimen_id = 3
          AND nueva.nombre = 'LOEP · Procesos sustantivos configurables'
          AND nueva.vigente_desde = '2024-03-21'
      );
  `);
  db.prepare(
    `INSERT OR IGNORE INTO escalas_salariales
      (regimen_id, nombre, anio, vigente_desde, vigente_hasta, estado, referencia_legal, fuente_url, observacion)
     VALUES (3, ?, 2024, '2024-03-21', NULL, 'REFERENCIAL', 'LOEP y Acuerdo Ministerial MDT-2024-039', ?, ?)`,
  ).run(
    "LOEP · Procesos sustantivos configurables",
    FUENTE_DIRECTRICES_LOEP,
    "No es una tabla oficial universal. Configure denominaciones y valores según la escala aprobada por el Directorio de la empresa pública; el límite general vigente es la RMU del Presidente de la República.",
  );
  const escalaLoep = db
    .prepare("SELECT id FROM escalas_salariales WHERE regimen_id = 3 AND nombre = ? AND vigente_desde = '2024-03-21'")
    .get("LOEP · Procesos sustantivos configurables") as { id: number };
  const insertarFilaLoep = db.prepare(
    `INSERT OR IGNORE INTO escala_salarial_detalles
      (escala_id, codigo_referencia, denominacion, comision, rama, estructura_ocupacional, minimo_cent, tipo_valor, regla)
     VALUES (?, ?, ?, 'Escala interna de empresa pública', ?, NULL, 0, 'MENSUAL', 'REFERENCIA')`,
  );
  db.transaction(() => {
    for (const [codigo, denominacion, grupo] of PLANTILLA_ESCALA_LOEP) {
      insertarFilaLoep.run(escalaLoep.id, codigo, denominacion, grupo);
    }
  })();

  // Punto de partida 2026. No reproduce estimaciones privadas: solo registra
  // el piso general publicado oficialmente y permite sustituirlo por la fila
  // sectorial exacta de cada cargo cuando se cargue el catálogo aplicable.
  db.exec(`
    INSERT OR IGNORE INTO escalas_salariales
      (regimen_id, nombre, anio, vigente_desde, vigente_hasta, estado, referencia_legal, fuente_url, observacion)
    VALUES
      (1, 'Piso general transitorio 2026', 2026, '2026-01-01', NULL, 'TRANSITORIA',
       'Acuerdo Ministerial MDT-2025-195',
       'https://www.trabajo.gob.ec/wp-content/uploads/downloads/2026/01/ACUERDO-MINISTERIAL-MDT-2025-195.pdf',
       'Piso general. Para Código del Trabajo debe reemplazarse por el salario sectorial específico cuando sea superior.');

    INSERT OR IGNORE INTO escala_salarial_detalles
      (escala_id, codigo_referencia, denominacion, comision, rama, estructura_ocupacional, minimo_cent, tipo_valor)
    SELECT id, 'SBU-GENERAL', 'Salario Básico Unificado 2026', '', '', NULL, 48200, 'MENSUAL'
    FROM escalas_salariales
    WHERE regimen_id = 1 AND nombre = 'Piso general transitorio 2026' AND vigente_desde = '2026-01-01';

    INSERT OR IGNORE INTO historial_sueldos
      (empleado_id, sueldo_cent, vigente_desde, vigente_hasta, motivo, detalle_escala_id)
    SELECT id, sueldo_base_cent, fecha_ingreso, NULL, 'Saldo inicial migrado', NULL
    FROM empleados;
  `);

  // Solo durante la adopción inicial enlaza los cargos preexistentes al piso
  // general. Después el usuario puede quitar o cambiar ese vínculo sin que un
  // reinicio de la aplicación lo restaure.
  const asignacionInicial = db
    .prepare("SELECT 1 FROM migraciones WHERE clave = 'escalas_2026_asignacion_inicial'")
    .get();
  if (!asignacionInicial) {
    db.transaction(() => {
      db.exec(`
        INSERT OR IGNORE INTO cargo_escalas (cargo_id, regimen_id, codigo_referencia)
        SELECT id, 1, 'SBU-GENERAL' FROM cargos;
      `);
      db.prepare("INSERT INTO migraciones (clave, aplicada_en) VALUES (?, ?)").run(
        "escalas_2026_asignacion_inicial",
        new Date().toISOString(),
      );
    })();
  }

  const vinculacionSoftware = db
    .prepare("SELECT 1 FROM migraciones WHERE clave = 'catalogo_sectorial_software_2025'")
    .get();
  if (!vinculacionSoftware) {
    const equivalencias = [
      ["Contadora general", "1910000000012"],
      ["Asistente administrativo", "1910000000028"],
      ["Operario de bodega", "1910000000023"],
      ["Jefa de ventas", "1920000000008"],
      ["Analista de talento humano", "1910000000013"],
      ["Técnica administrativa", "1910000000028"],
      ["Guardia de seguridad", "1911740000051"],
      ["Secretaria", "1910000000024"],
    ] as const;
    db.transaction(() => {
      for (const [nombre, codigo] of equivalencias) {
        const cargo = db.prepare("SELECT id FROM cargos WHERE nombre = ? COLLATE NOCASE").get(nombre) as
          | { id: number }
          | undefined;
        if (!cargo) continue;
        const asignacion = db
          .prepare("SELECT codigo_referencia FROM cargo_escalas WHERE cargo_id = ? AND regimen_id = 1")
          .get(cargo.id) as { codigo_referencia: string } | undefined;
        if (asignacion && asignacion.codigo_referencia !== "SBU-GENERAL") continue;
        db.prepare(
          `INSERT INTO cargo_escalas (cargo_id, regimen_id, codigo_referencia) VALUES (?, 1, ?)
           ON CONFLICT(cargo_id, regimen_id) DO UPDATE SET codigo_referencia=excluded.codigo_referencia`,
        ).run(cargo.id, codigo);
        const detalle = db
          .prepare("SELECT estructura_ocupacional FROM escala_salarial_detalles WHERE escala_id = ? AND codigo_referencia = ?")
          .get(escalaSectorial.id, codigo) as { estructura_ocupacional: string };
        db.prepare("UPDATE cargos SET estructura_ocupacional = ? WHERE id = ?").run(detalle.estructura_ocupacional, cargo.id);
        db.prepare("UPDATE empleados SET estructura_ocupacional = ? WHERE cargo_id = ?").run(
          detalle.estructura_ocupacional,
          cargo.id,
        );
      }
      db.prepare("INSERT INTO migraciones (clave, aplicada_en) VALUES (?, ?)").run(
        "catalogo_sectorial_software_2025",
        new Date().toISOString(),
      );
    })();
  }

  // Vincula los cargos demostrativos LOSEP por su grupo ocupacional. Esta
  // adopción se ejecuta una sola vez y nunca pisa una elección posterior.
  const vinculacionLosep = db
    .prepare("SELECT 1 FROM migraciones WHERE clave = 'catalogo_losep_20_grados' ")
    .get();
  if (!vinculacionLosep) {
    const equivalenciasLosep = [
      ["Analista de talento humano", "LOSEP-G12"],
      ["Técnica administrativa", "LOSEP-G09"],
      ["Guardia de seguridad", "LOSEP-G05"],
      ["Secretaria", "LOSEP-G07"],
    ] as const;
    db.transaction(() => {
      for (const [nombre, codigo] of equivalenciasLosep) {
        const cargo = db.prepare("SELECT id FROM cargos WHERE nombre = ? COLLATE NOCASE").get(nombre) as
          | { id: number }
          | undefined;
        if (!cargo) continue;
        db.prepare(
          `INSERT OR IGNORE INTO cargo_escalas (cargo_id, regimen_id, codigo_referencia)
           VALUES (?, 2, ?)`,
        ).run(cargo.id, codigo);
      }
      db.prepare("INSERT INTO migraciones (clave, aplicada_en) VALUES (?, ?)").run(
        "catalogo_losep_20_grados",
        new Date().toISOString(),
      );
    })();
  }

  // Deja operativo el nuevo régimen en instalaciones existentes. Cada clave
  // ausente parte de los valores CT solo como referencia editable; la LOEP es
  // un régimen propio y sus valores deben validarse para cada empresa pública.
  db.exec(`
    INSERT INTO parametros (regimen_id, clave, valor, tipo, descripcion, vigente_desde, vigente_hasta)
    SELECT 3, origen.clave, origen.valor, origen.tipo,
           origen.descripcion || ' (referencia inicial; verificar para LOEP)',
           origen.vigente_desde, origen.vigente_hasta
    FROM parametros origen
    WHERE origen.regimen_id = 1
      AND NOT EXISTS (
        SELECT 1 FROM parametros destino
        WHERE destino.regimen_id = 3 AND destino.clave = origen.clave
      )
  `);
  migrarNominaDetallada(db);
}

export function openDb(file = DB_PATH): Database.Database {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

const globalForDb = globalThis as unknown as { __nominaDb?: Database.Database };

export function getDb(): Database.Database {
  if (!globalForDb.__nominaDb) globalForDb.__nominaDb = openDb();
  return globalForDb.__nominaDb;
}
