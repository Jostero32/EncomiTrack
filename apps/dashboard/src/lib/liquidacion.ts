import "server-only";

/** Cliente de solo lectura para la API pública del sistema EncomiTrack — Paz y salvo y liquidación. */
const BASE = process.env.LIQUIDACION_API_URL || "http://liquidacion-backend:3000/liquidacion/api";

export interface LiqDashboard {
  totalTrabajadores: number;
  activos: number;
  totalExpedientes: number;
  enProceso: number;
  pazSalvoPendientes: number;
  finalizados: number;
}

export interface LiqExpediente {
  id: number;
  numero: string;
  fechaIngreso: string;
  fechaSalida: string;
  causa: string;
  region: string;
  cargo: string;
  remuneracion: string;
  responsable: string | null;
  estado: string;
  trabajador?: { nombres: string; apellidos: string; departamento: string | null };
}

export interface LiqRequisito {
  id: number;
  departamento: string;
  pregunta: string;
  respuestaEsperada: string;
  orden: number;
}

export interface LiqEmpresa {
  razonSocial: string;
  direccion: string;
  ciudad: string;
  representante: string;
  elaboradoNombre: string;
  elaboradoCargo: string;
  revisadoNombre: string;
  revisadoCargo: string;
  aprobadoNombre: string;
  aprobadoCargo: string;
}

export interface LiquidacionLive {
  dashboard: LiqDashboard;
  expedientes: LiqExpediente[];
  requisitos: LiqRequisito[];
  empresa: LiqEmpresa | null;
  fetchedAt: string;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/${path}`, {
    next: { revalidate: 60 },
    signal: AbortSignal.timeout(6000),
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

/** Devuelve null si el sistema no responde: la página sigue funcionando sin el panel. */
export async function getLiquidacionLive(): Promise<LiquidacionLive | null> {
  try {
    const [dashboard, expedientes, requisitos, empresa] = await Promise.all([
      get<LiqDashboard>("dashboard"),
      get<LiqExpediente[]>("expedientes"),
      get<LiqRequisito[]>("plantilla-requisitos"),
      get<LiqEmpresa>("empresa").catch(() => null),
    ]);
    // Se descartan datos personales sensibles (cédulas) antes de enviarlos al cliente.
    const clean = expedientes.map((e) => ({
      id: e.id,
      numero: e.numero,
      fechaIngreso: e.fechaIngreso,
      fechaSalida: e.fechaSalida,
      causa: e.causa,
      region: e.region,
      cargo: e.cargo,
      remuneracion: e.remuneracion,
      responsable: e.responsable,
      estado: e.estado,
      trabajador: e.trabajador
        ? { nombres: e.trabajador.nombres, apellidos: e.trabajador.apellidos, departamento: e.trabajador.departamento }
        : undefined,
    }));
    return {
      dashboard,
      expedientes: clean.sort((a, b) => a.numero.localeCompare(b.numero)),
      requisitos: [...requisitos].sort((a, b) => a.orden - b.orden),
      empresa,
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
