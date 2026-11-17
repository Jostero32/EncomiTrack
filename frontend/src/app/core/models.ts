export type EstadoTrabajador = 'Activo' | 'Finalizado';

export type EstadoExpediente =
  | 'En proceso'
  | 'Paz y salvo aprobado'
  | 'Finalizado';

export type EstadoRequisito = 'Pendiente' | 'Aprobado' | 'Rechazado';

export type Causa =
  | 'Renuncia voluntaria'
  | 'Desahucio'
  | 'Despido intempestivo'
  | 'Mutuo acuerdo'
  | 'Fin de contrato';

export type Region = 'Sierra-Amazonía' | 'Costa-Galápagos';

export interface Empresa {
  id: number;
  razonSocial: string;
  ruc: string;
  direccion: string;
  representante: string;
}

export interface Trabajador {
  id: number;
  cedula: string;
  nombres: string;
  apellidos: string;
  cargo: string;
  departamento: string;
  fechaIngreso: string;
  remuneracion: string;
  estado: EstadoTrabajador;
}

export interface Requisito {
  id: number;
  expedienteId: number;
  departamento: string;
  descripcion: string;
  estado: EstadoRequisito;
  responsable: string | null;
  fechaRevision: string | null;
  observacion: string | null;
}

export interface RubroLiquidacion {
  concepto: string;
  tipo: 'haber' | 'deduccion';
  valor: string;
  formula: string;
  origen: 'auto' | 'manual';
}

export interface ManualItem {
  concepto: string;
  valor: number | string;
  justificacion: string;
}

export interface EntradasLiquidacion {
  diasVacacionesPendientesAnteriores?: number;
  otrosHaberes?: ManualItem[];
  anticipos?: ManualItem[];
  otrasDeducciones?: ManualItem[];
}

export interface Liquidacion {
  id: number;
  expedienteId: number;
  entradas: EntradasLiquidacion;
  rubros: RubroLiquidacion[];
  totalHaberes: string;
  totalDeducciones: string;
  neto: string;
  confirmada: boolean;
  fechaConfirmacion: string | null;
}

export interface Expediente {
  id: number;
  numero: string;
  trabajador: Trabajador;
  trabajadorId: number;
  fechaIngreso: string;
  fechaSalida: string;
  causa: Causa;
  region: Region;
  decimosMensualizados: boolean;
  cargo: string;
  remuneracion: string;
  observaciones: string | null;
  responsable: string | null;
  estado: EstadoExpediente;
  createdAt: string;
  requisitos?: Requisito[];
  liquidacion?: Liquidacion | null;
}

export interface DashboardData {
  totalTrabajadores: number;
  activos: number;
  totalExpedientes: number;
  enProceso: number;
  pazSalvoPendientes: number;
  finalizados: number;
  ultimos5: Expediente[];
}

export interface ApiError {
  message: string;
}

export interface CrearTrabajadorDto {
  cedula: string;
  nombres: string;
  apellidos: string;
  cargo: string;
  departamento: string;
  fechaIngreso: string;
  remuneracion: number | string;
  estado?: EstadoTrabajador;
}

export interface CrearExpedienteDto {
  trabajadorId: number;
  fechaSalida: string;
  causa: Causa;
  region: Region;
  decimosMensualizados: boolean;
  observaciones?: string | null;
  responsable?: string | null;
}

export interface PatchRequisitoDto {
  estado: EstadoRequisito;
  responsable: string;
  observacion?: string | null;
}
