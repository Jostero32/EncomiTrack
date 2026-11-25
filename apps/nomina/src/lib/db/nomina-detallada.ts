import type Database from "better-sqlite3";

/** Ampliación aditiva; conserva las copias de los roles ya emitidos. */
export function migrarNominaDetallada(db: Database.Database) {
  db.transaction(() => {
    const columnas = (tabla: string) => (db.prepare(`PRAGMA table_info(${tabla})`).all() as { name: string }[]).map(c => c.name);
    if (!columnas("empleados").includes("fondos_reserva_modalidad")) {
      db.exec("ALTER TABLE empleados ADD COLUMN fondos_reserva_modalidad TEXT NOT NULL DEFAULT 'DIRECTO' CHECK (fondos_reserva_modalidad IN ('DIRECTO','IESS'))");
    }
    for (const campo of ["impuesto_renta_cent", "pago_decimo_tercero_cent", "pago_decimo_cuarto_cent"]) {
      if (!columnas("novedades").includes(campo)) db.exec(`ALTER TABLE novedades ADD COLUMN ${campo} INTEGER NOT NULL DEFAULT 0 CHECK (${campo} >= 0)`);
    }
    if (!columnas("novedades").includes("descuentos_detalle_json")) {
      db.exec("ALTER TABLE novedades ADD COLUMN descuentos_detalle_json TEXT CHECK (descuentos_detalle_json IS NULL OR (json_valid(descuentos_detalle_json) AND json_type(descuentos_detalle_json) = 'array'))");
    }
    db.exec(`CREATE TABLE IF NOT EXISTS historial_condiciones_nomina (
      empleado_id INTEGER NOT NULL REFERENCES empleados(id),
      vigente_desde TEXT NOT NULL,
      regimen_id INTEGER NOT NULL REFERENCES regimenes(id),
      mensualiza_13 INTEGER NOT NULL,
      mensualiza_14 INTEGER NOT NULL,
      aplica_fondos_reserva INTEGER NOT NULL,
      fondos_reserva_modalidad TEXT NOT NULL CHECK (fondos_reserva_modalidad IN ('DIRECTO','IESS')),
      region TEXT NOT NULL,
      PRIMARY KEY (empleado_id, vigente_desde)
    );
    INSERT INTO historial_condiciones_nomina
      SELECT id, fecha_ingreso, regimen_id, mensualiza_13, mensualiza_14, aplica_fondos_reserva, fondos_reserva_modalidad, region
      FROM empleados e WHERE NOT EXISTS (SELECT 1 FROM historial_condiciones_nomina h WHERE h.empleado_id=e.id);`);
    const clave = "nomina-detallada-base-ct-2026-10";
    if (!db.prepare("SELECT 1 FROM migraciones WHERE clave=?").get(clave)) {
      // Conversión solicitada de la base actual. Septiembre conserva su régimen.
      db.exec(`INSERT OR REPLACE INTO historial_condiciones_nomina
        SELECT e.id, MAX(e.fecha_ingreso, '2026-10-01'), r.id, e.mensualiza_13, e.mensualiza_14,
               e.aplica_fondos_reserva, e.fondos_reserva_modalidad, e.region
        FROM empleados e JOIN regimenes r ON r.codigo='CT';
        UPDATE empleados SET regimen_id=(SELECT id FROM regimenes WHERE codigo='CT');`);
      db.prepare("INSERT INTO migraciones (clave, aplicada_en) VALUES (?, ?)").run(clave, new Date().toISOString());
    }
  })();
}
