/**
 * Árbol del organigrama por jerarquía de cargos ("reporta a").
 * Función pura: recibe cargos y empleados ya leídos de la base.
 */

interface CargoJerarquia {
  id: number;
  nombre: string;
  activo: boolean;
  reportaAId: number | null;
  estructuraOcupacional: string | null;
}

interface PersonaJerarquia {
  cargoId: number | null;
  activo: boolean;
}

export interface NodoJerarquia<C extends CargoJerarquia, P extends PersonaJerarquia> {
  cargo: C;
  /** Empleados activos que ocupan el cargo; vacío = puesto por definir. */
  personas: P[];
  hijos: NodoJerarquia<C, P>[];
}

const ordenar = (a: CargoJerarquia, b: CargoJerarquia) =>
  (a.estructuraOcupacional ?? "Z").localeCompare(b.estructuraOcupacional ?? "Z") || a.nombre.localeCompare(b.nombre, "es");

/**
 * - Solo cargos activos y empleados activos.
 * - Si el superior está inactivo, el cargo cuelga del siguiente superior activo.
 * - Se ocultan los cargos sin personas que tampoco tienen subordinados visibles;
 *   un cargo vacante con subordinados se muestra como "por definir".
 * - Un ciclo en los datos se corta: el cargo queda como raíz.
 */
export function construirJerarquia<C extends CargoJerarquia, P extends PersonaJerarquia>(
  cargos: C[],
  empleados: P[],
): NodoJerarquia<C, P>[] {
  const porId = new Map(cargos.map((cargo) => [cargo.id, cargo]));

  const superiorActivo = (cargo: C): number | null => {
    const visitados = new Set<number>([cargo.id]);
    let actual = cargo.reportaAId;
    while (actual !== null) {
      const superior = porId.get(actual);
      if (!superior || visitados.has(actual)) return null;
      if (superior.activo) return actual;
      visitados.add(actual);
      actual = superior.reportaAId;
    }
    return null;
  };

  const nodos = new Map<number, NodoJerarquia<C, P>>();
  for (const cargo of cargos.filter((c) => c.activo).sort(ordenar)) {
    nodos.set(cargo.id, {
      cargo,
      personas: empleados.filter((empleado) => empleado.activo && empleado.cargoId === cargo.id),
      hijos: [],
    });
  }

  const raices: NodoJerarquia<C, P>[] = [];
  for (const nodo of nodos.values()) {
    const superior = superiorActivo(nodo.cargo);
    const padre = superior === null ? undefined : nodos.get(superior);
    // Un ciclo entre cargos activos haría que ninguno llegue a una raíz: se
    // corta tratando como raíz al cargo cuyo superior ya es su descendiente.
    if (padre && !esDescendiente(padre, nodo.cargo.id, nodos)) padre.hijos.push(nodo);
    else raices.push(nodo);
  }

  const visible = (nodo: NodoJerarquia<C, P>): boolean => {
    nodo.hijos = nodo.hijos.filter(visible);
    return nodo.personas.length > 0 || nodo.hijos.length > 0;
  };
  return raices.filter(visible);
}

/** ¿`posible` está debajo de `idAncestro` siguiendo los superiores ya enlazados? */
function esDescendiente<C extends CargoJerarquia, P extends PersonaJerarquia>(
  posible: NodoJerarquia<C, P>,
  idAncestro: number,
  nodos: Map<number, NodoJerarquia<C, P>>,
): boolean {
  const visitados = new Set<number>();
  let actual: number | null = posible.cargo.id;
  while (actual !== null && !visitados.has(actual)) {
    if (actual === idAncestro) return true;
    visitados.add(actual);
    actual = nodos.get(actual)?.cargo.reportaAId ?? null;
  }
  return false;
}
