import { afterEach, describe, expect, it } from "vitest";
import type Database from "better-sqlite3";
import { openDb } from "./db";
import {
  actualizarEmpleado,
  crearCargo,
  crearEmpleado,
  crearEscalaSalarial,
  guardarDetalleEscala,
  listDetallesEscala,
  listHistorialSueldos,
  minimoSalarialCargo,
  type EmpleadoInput,
} from "./repo";

let db: Database.Database | undefined;
afterEach(() => db?.close());

describe("escalas salariales versionadas", () => {
  it("precarga LOSEP con 20 grados y LOEP como plantilla institucional configurable", () => {
    db = openDb(":memory:");
    const detalles = listDetallesEscala(db);
    const losep = detalles.filter((detalle) => detalle.regimenCodigo === "LOSEP");
    const loep = detalles.filter((detalle) => detalle.regimenCodigo === "LOEP");

    expect(losep).toHaveLength(20);
    expect(losep[0].regla).toBe("FIJO");
    expect(losep.find((detalle) => detalle.codigoReferencia === "LOSEP-G12")).toMatchObject({
      denominacion: "Servidor Público 6",
      minimoCent: 141200,
      regla: "FIJO",
    });
    expect(loep).toHaveLength(26);
    expect(loep.filter((detalle) => detalle.codigoReferencia.startsWith("LOEP-PUBLICO-"))).toHaveLength(20);
    expect(
      loep
        .filter((detalle) => detalle.codigoReferencia.startsWith("LOEP-") && !detalle.codigoReferencia.startsWith("LOEP-PUBLICO-"))
        .every((detalle) => detalle.regla === "REFERENCIA" && detalle.minimoCent === 0),
    ).toBe(true);

    const cargoId = crearCargo(db, {
      nombre: "Analista público",
      estructuraOcupacional: "C1",
      descripcion: "",
      asignacionesSalariales: [{ regimenId: 2, codigoReferencia: "LOSEP-G12" }],
    });
    const empleado: EmpleadoInput = {
      cedula: "0000000000",
      nombres: "Escala",
      apellidos: "LOSEP",
      cargoId,
      regimenId: 2,
      sueldoBaseCent: 141199,
      fechaIngreso: "2026-01-01",
      region: "SIERRA_ORIENTE",
      mensualiza13: true,
      mensualiza14: true,
      aplicaFondosReserva: true,
    };
    expect(() => crearEmpleado(db!, empleado)).toThrow(/debe coincidir con la RMU/);
    expect(() => crearEmpleado(db!, { ...empleado, sueldoBaseCent: 141200 })).not.toThrow();
  });

  it("carga el catálogo para software y aplica tanto cargos TIC como administrativos", () => {
    db = openDb(":memory:");
    const catalogo = listDetallesEscala(db).filter((detalle) => detalle.escalaNombre.includes("Empresa de software"));
    expect(catalogo).toHaveLength(106);

    const programador = crearCargo(db, {
      nombre: "Desarrollador junior",
      estructuraOcupacional: "C3",
      descripcion: "",
      asignacionesSalariales: [{ regimenId: 1, codigoReferencia: "1230000000011" }],
    });
    const asistente = crearCargo(db, {
      nombre: "Asistente de oficina",
      estructuraOcupacional: "D1",
      descripcion: "",
      asignacionesSalariales: [{ regimenId: 1, codigoReferencia: "1910000000028" }],
    });

    expect(minimoSalarialCargo(db, programador, 1, "2026-10-20")).toMatchObject({
      codigoReferencia: "1230000000011",
      minimoCent: 50080,
    });
    expect(minimoSalarialCargo(db, asistente, 1, "2026-10-20")).toMatchObject({
      codigoReferencia: "SBU-GENERAL",
      minimoCent: 48200,
    });
  });

  it("conserva el último sectorial y aplica el mayor entre ese valor y el SBU del nuevo año", () => {
    db = openDb(":memory:");
    const escala2025 = crearEscalaSalarial(db, {
      regimenId: 1,
      nombre: "Sectorial 2025",
      anio: 2025,
      vigenteDesde: "2025-01-01",
      vigenteHasta: "2025-12-31",
      estado: "OFICIAL",
      referenciaLegal: "Prueba",
      fuenteUrl: "",
      observacion: "",
    });
    guardarDetalleEscala(db, {
      escalaId: escala2025,
      codigoReferencia: "SECTOR-001",
      denominacion: "Cargo sectorial",
      comision: "1",
      rama: "Prueba",
      estructuraOcupacional: "C1",
      minimoCent: 49000,
      tipoValor: "MENSUAL",
      regla: "MINIMO",
    });
    const cargoId = crearCargo(db, {
      nombre: "Sectorial de prueba",
      estructuraOcupacional: "C1",
      descripcion: "",
      asignacionesSalariales: [{ regimenId: 1, codigoReferencia: "SECTOR-001" }],
    });

    const minimo = minimoSalarialCargo(db, cargoId, 1, "2026-06-01");
    expect(minimo).toMatchObject({ codigoReferencia: "SECTOR-001", minimoCent: 49000 });
  });

  it("impide sueldos menores y aplica al cargo una nueva versión con el mismo código", () => {
    db = openDb(":memory:");
    const cargoId = crearCargo(db, {
      nombre: "Cargo de prueba",
      estructuraOcupacional: "C1",
      descripcion: "",
      asignacionesSalariales: [{ regimenId: 1, codigoReferencia: "SBU-GENERAL" }],
    });
    const base: EmpleadoInput = {
      cedula: "0000000000",
      nombres: "Prueba",
      apellidos: "Escala",
      cargoId,
      regimenId: 1,
      sueldoBaseCent: 48199,
      sueldoVigenteDesde: "2026-01-01",
      fechaIngreso: "2026-01-01",
      region: "SIERRA_ORIENTE",
      mensualiza13: true,
      mensualiza14: true,
      aplicaFondosReserva: true,
    };
    expect(() => crearEmpleado(db!, base)).toThrow(/inferior al mínimo/);

    const empleadoId = crearEmpleado(db, { ...base, sueldoBaseCent: 48200 });
    const escala2027 = crearEscalaSalarial(db, {
      regimenId: 1,
      nombre: "Escala 2027",
      anio: 2027,
      vigenteDesde: "2027-01-01",
      vigenteHasta: null,
      estado: "OFICIAL",
      referenciaLegal: "Prueba",
      fuenteUrl: "",
      observacion: "",
    });
    guardarDetalleEscala(db, {
      escalaId: escala2027,
      codigoReferencia: "SBU-GENERAL",
      denominacion: "SBU 2027",
      comision: "",
      rama: "",
      estructuraOcupacional: null,
      minimoCent: 50000,
      tipoValor: "MENSUAL",
      regla: "MINIMO",
    });

    expect(minimoSalarialCargo(db, cargoId, 1, "2026-12-31")?.minimoCent).toBe(48200);
    expect(minimoSalarialCargo(db, cargoId, 1, "2027-01-01")?.minimoCent).toBe(50000);
    expect(() =>
      actualizarEmpleado(db!, empleadoId, { ...base, sueldoBaseCent: 49999, sueldoVigenteDesde: "2027-01-01" }),
    ).toThrow(/inferior al mínimo/);

    actualizarEmpleado(db, empleadoId, {
      ...base,
      sueldoBaseCent: 55000,
      sueldoVigenteDesde: "2027-01-01",
      motivoCambioSueldo: "Nueva escala anual",
    });
    const historial = listHistorialSueldos(db).filter((item) => item.empleadoId === empleadoId);
    expect(historial).toHaveLength(2);
    expect(historial[0]).toMatchObject({ sueldoCent: 55000, vigenteDesde: "2027-01-01" });
    expect(historial[1].vigenteHasta).toBe("2026-12-31");
  });
});
