import { describe, expect, it } from "vitest";
import { descuentosDelRol, leerDescuentosForm, resolverDescuentos, totalDescuentos } from "./descuentos";

describe("descuentos manuales", () => {
  it("suma centavos exactos, acepta coma decimal y limpia los conceptos", () => {
    const detalle = leerDescuentosForm([{ concepto: " Anticipo ", importe: "30.10" }, { concepto: "Préstamo", importe: "20,20" }]);
    expect(detalle).toEqual([{ concepto: "Anticipo", valorCent: 3010 }, { concepto: "Préstamo", valorCent: 2020 }]);
    expect(totalDescuentos(detalle)).toBe(5030);
  });

  it.each(["0", "-1", "1.005", "1,000.00", "abc", "", "9007199254740992"])("rechaza importe inválido %s", importe => {
    expect(() => leerDescuentosForm([{ concepto: "Anticipo", importe }])).toThrow();
  });

  it("exige un concepto y limita los importes al rango entero seguro", () => {
    expect(() => leerDescuentosForm([{ concepto: "  ", importe: "1" }])).toThrow(/concepto/);
    expect(() => resolverDescuentos(0, [{ concepto: "Anticipo", valorCent: 1.5 }])).toThrow();
    expect(() => resolverDescuentos(0, [{ concepto: "A", valorCent: Number.MAX_SAFE_INTEGER }, { concepto: "B", valorCent: 1 }])).toThrow(/total/);
  });

  it("conserva el agregado anterior y permite retirarlo con un detalle vacío", () => {
    expect(resolverDescuentos(3000)).toEqual([{ concepto: "Otros descuentos", valorCent: 3000 }]);
    expect(resolverDescuentos(3000, [])).toEqual([]);
    expect(descuentosDelRol({ egresos: [{ codigo: "descuentos", nombre: "Otros descuentos", valorCent: 3000 }, { codigo: "aporte_iess_personal", nombre: "IESS", valorCent: 7560 }] })).toEqual([{ concepto: "Otros descuentos", valorCent: 3000 }]);
  });
});
