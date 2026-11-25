import { describe, expect, it } from "vitest";
import { construirJerarquia } from "./jerarquia";

const cargo = (id: number, nombre: string, reportaAId: number | null, activo = true) => ({
  id,
  nombre,
  reportaAId,
  activo,
  estructuraOcupacional: null,
});
const persona = (cargoId: number, activo = true) => ({ cargoId, activo });

const nombres = (nodos: ReturnType<typeof construirJerarquia>): unknown[] =>
  nodos.map((n) => (n.hijos.length ? { [n.cargo.nombre]: nombres(n.hijos) } : n.cargo.nombre));

describe("construirJerarquia", () => {
  it("muestra un cargo vacante cuando tiene subordinados con personas", () => {
    const arbol = construirJerarquia(
      [cargo(1, "Gerencia", null), cargo(2, "Técnica", 1), cargo(3, "Bodega", 2)],
      [persona(2), persona(3)],
    );
    expect(nombres(arbol)).toEqual([{ Gerencia: [{ Técnica: ["Bodega"] }] }]);
    expect(arbol[0].personas).toHaveLength(0);
  });

  it("oculta cargos sin personas ni subordinados visibles", () => {
    const arbol = construirJerarquia(
      [cargo(1, "Gerencia", null), cargo(2, "Ventas", 1), cargo(3, "Vacante", 1)],
      [persona(1), persona(2), persona(3, false)],
    );
    expect(nombres(arbol)).toEqual([{ Gerencia: ["Ventas"] }]);
  });

  it("salta superiores inactivos", () => {
    const arbol = construirJerarquia(
      [cargo(1, "Gerencia", null), cargo(2, "Inactivo", 1, false), cargo(3, "Bodega", 2)],
      [persona(1), persona(3)],
    );
    expect(nombres(arbol)).toEqual([{ Gerencia: ["Bodega"] }]);
  });

  it("no entra en bucle si los datos tienen un ciclo", () => {
    const arbol = construirJerarquia([cargo(1, "A", 2), cargo(2, "B", 1)], [persona(1), persona(2)]);
    expect(arbol.map((n) => n.cargo.nombre).sort()).toEqual(["A", "B"]);
  });
});
