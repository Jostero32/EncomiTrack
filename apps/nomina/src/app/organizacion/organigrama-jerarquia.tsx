import type { CSSProperties } from "react";
import { CircleUserRound } from "lucide-react";
import { RegimenBadge } from "@/components/regimen-badge";
import type { NodoJerarquia } from "@/lib/jerarquia";
import type { Cargo, Empleado } from "@/lib/repo";
import { COLORES_NIVEL, iniciales } from "./comun";

type Nodo = NodoJerarquia<Cargo, Empleado>;

/**
 * Bajo los niveles intermedios, los subordinados sin personal a cargo se apilan
 * en columna para que el árbol no crezca a lo ancho.
 */
const apilarHijos = (nodo: Nodo, raiz: boolean) =>
  !raiz && nodo.hijos.length >= 2 && nodo.hijos.every((hijo) => hijo.hijos.length === 0);

function NodoCargo({ nodo, raiz = false }: { nodo: Nodo; raiz?: boolean }) {
  const { cargo, personas } = nodo;
  const estructura = cargo.estructuraOcupacional;
  const style = { "--org-accent": estructura ? COLORES_NIVEL[estructura.charAt(0)] : "#6b7280" } as CSSProperties;
  const regimenes = Array.from(new Set(personas.map((persona) => persona.regimenCodigo)));

  return (
    <li>
      <article className={`org-tree-node ${personas.length ? "" : "org-tree-node-vacante"}`} style={style}>
        {personas.length === 0 ? (
          <div className="org-tree-person">
            <span className="org-tree-avatar org-tree-avatar-vacante" aria-hidden="true">
              <CircleUserRound className="size-6" />
            </span>
            <span className="org-tree-name">{cargo.nombre}</span>
            <span className="org-tree-role">Por definir</span>
          </div>
        ) : (
          <>
            {personas.map((persona) => (
              <div key={persona.id} className="org-tree-person">
                <span className="org-tree-avatar" aria-hidden="true">
                  {iniciales(persona)}
                </span>
                <span className="org-tree-name">
                  {persona.nombres} {persona.apellidos}
                </span>
              </div>
            ))}
            <span className="org-tree-role">{cargo.nombre}</span>
          </>
        )}
        <span className="org-tree-meta">
          {estructura && <span className="org-tree-code">{estructura}</span>}
          {regimenes.map((codigo) => (
            <RegimenBadge key={codigo} codigo={codigo} />
          ))}
        </span>
      </article>
      {nodo.hijos.length > 0 && (
        <ul className={apilarHijos(nodo, raiz) ? "org-tree-stack" : undefined}>
          {nodo.hijos.map((hijo) => (
            <NodoCargo key={hijo.cargo.id} nodo={hijo} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Organigrama por jerarquía de cargos ("reporta a"). */
export function OrganigramaJerarquia({ raices }: { raices: Nodo[] }) {
  return (
    <div className="org-map-viewport" role="region" aria-label="Organigrama por jerarquía" tabIndex={0}>
      <div className="org-tree">
        <ul>
          {raices.map((nodo) => (
            <NodoCargo key={nodo.cargo.id} nodo={nodo} raiz />
          ))}
        </ul>
      </div>
    </div>
  );
}
