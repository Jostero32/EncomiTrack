export type EstadoTrabajador = 'Activo' | 'Finalizado';

export type EstadoExpediente =
  | 'En proceso'
  | 'Paz y salvo aprobado'
  | 'Finalizado';

export type RespuestaRequisito = 'SI' | 'NO' | 'N/A';
export type RespuestaEsperada = 'SI' | 'NO';
export type OrigenRequisito = 'Plantilla' | 'Bien' | 'Obligacion';

export const TIPOS_VINCULO = ['Código de Trabajo', 'Contrato', 'Nombramiento'] as const;
export type TipoVinculo = (typeof TIPOS_VINCULO)[number];

export const TIPOS_BIEN = [
  'Equipo',
  'Herramienta',
  'Credencial',
  'Acceso a sistema',
  'Documento',
  'Otro',
] as const;
export type TipoBien = (typeof TIPOS_BIEN)[number];

export const DEPARTAMENTOS_RESPONSABLES = [
  'Talento Humano',
  'Sistemas',
  'Contabilidad',
  'Bodega',
  'Administrativo',
] as const;
export type DepartamentoResponsable = (typeof DEPARTAMENTOS_RESPONSABLES)[number];

export const ESTADOS_BIEN = ['Asignado', 'Devuelto', 'No aplica'] as const;
export type EstadoBien = (typeof ESTADOS_BIEN)[number];

export const TIPOS_OBLIGACION = ['Anticipo', 'Préstamo', 'Caja chica', 'Otro'] as const;
export type TipoObligacion = (typeof TIPOS_OBLIGACION)[number];

/** 'Por descontar': se descuenta en la liquidación (queda Pagada al finalizar). */
export const ESTADOS_OBLIGACION = ['Pendiente', 'Por descontar', 'Pagada'] as const;
export type EstadoObligacion = (typeof ESTADOS_OBLIGACION)[number];

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
  ciudad: string | null;
  elaboradoNombre: string | null;
  elaboradoCargo: string | null;
  revisadoNombre: string | null;
  revisadoCargo: string | null;
  aprobadoNombre: string | null;
  aprobadoCargo: string | null;
}

export interface Trabajador {
  id: number;
  cedula: string;
  nombres: string;
  apellidos: string;
  cargo: string;
  departamento: string;
  tipoVinculo: TipoVinculo;
  unidad: string | null;
  jefeInmediato: string | null;
  fechaIngreso: string;
  remuneracion: string;
  estado: EstadoTrabajador;
}

export interface BienAsignado {
  id: number;
  trabajadorId: number;
  tipo: TipoBien;
  descripcion: string;
  codigoSerie: string | null;
  departamentoResponsable: DepartamentoResponsable;
  fechaAsignacion: string | null;
  estado: EstadoBien;
  fechaDevolucion: string | null;
  observacion: string | null;
}

export interface Obligacion {
  id: number;
  trabajadorId: number;
  tipo: TipoObligacion;
  concepto: string;
  valor: string;
  fecha: string;
  estado: EstadoObligacion;
  justificacion: string | null;
}

export interface VacacionGozada {
  id: number;
  trabajadorId: number;
  fechaInicio: string;
  dias: number;
  documento: string | null;
  observacion: string | null;
}

export interface PeriodoVacaciones {
  numero: number;
  desde: string;
  hasta: string;
  completo: boolean;
  diasGenerados: number;
  diasGozados: number;
  saldo: number;
}

export interface ResumenVacaciones {
  fechaCorte: string;
  periodos: PeriodoVacaciones[];
  diasGozadosTotal: number;
  saldoPeriodosCompletos: number;
  gozadas: VacacionGozada[];
}

export interface PlantillaRequisito {
  id: number;
  departamento: string;
  pregunta: string;
  respuestaEsperada: RespuestaEsperada;
  orden: number;
}

export interface Requisito {
  id: number;
  expedienteId: number;
  departamento: string;
  origen: OrigenRequisito;
  referenciaId: number | null;
  pregunta: string;
  respuestaEsperada: RespuestaEsperada;
  respuesta: RespuestaRequisito | null;
  cumple: boolean;
  orden: number;
  responsable: string | null;
  fechaRevision: string | null;
  observacion: string | null;
  /** Bien u obligación de origen (solo en GET /expedientes/:id). */
  detalle?: DetalleRequisito | null;
  /** Número de evidencias adjuntas (solo en GET /expedientes/:id). */
  evidencias?: number;
}

export type DetalleRequisito =
  | {
      origen: 'Bien';
      tipo: TipoBien;
      descripcion: string;
      codigoSerie: string | null;
      fechaAsignacion: string | null;
      estado: string;
    }
  | {
      origen: 'Obligacion';
      tipo: string;
      concepto: string;
      valor: string;
      fecha: string;
      estado: string;
    };

export interface AprobacionDepartamento {
  id: number;
  expedienteId: number;
  departamento: string;
  responsable: string;
  cargo: string | null;
  fecha: string;
  observacion: string | null;
}

/** Orden de las áreas del paz y salvo (igual que en el backend). */
export const ORDEN_AREAS = [
  'Jefe inmediato',
  'Sistemas',
  'Bodega',
  'Contabilidad',
  'Talento Humano',
] as const;

export const SBU = 482;

export const TIPOS_DOCUMENTO = [
  'Carta de renuncia',
  'Notificación de despido',
  'Acta de entrega-recepción',
  'Informe de gestión',
  'Acción de personal',
  'Comprobante de pago',
  'Anexo de vacaciones',
  'Generado por el sistema',
  'Otro',
] as const;
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

export interface Documento {
  id: number;
  expedienteId: number;
  requisitoId: number | null;
  requisito?: Pick<Requisito, 'id' | 'pregunta' | 'departamento'> | null;
  tipo: TipoDocumento;
  nombreOriginal: string;
  nombreArchivo: string;
  mime: string;
  tamano: number;
  ruta: string;
  descripcion: string | null;
  fechaSubida: string;
}

export interface DocumentosFaltantes {
  sugeridos: TipoDocumento[];
  faltantes: TipoDocumento[];
  causa: Causa;
}

export interface RubroLiquidacion {
  concepto: string;
  tipo: 'haber' | 'deduccion';
  valor: string;
  formula: string;
  origen: 'auto' | 'manual' | 'obligacion';
}

export interface ManualItem {
  concepto: string;
  valor: number | string;
  justificacion: string;
}

export interface EntradasLiquidacion {
  diasVacacionesPendientesAnteriores?: number | null;
  diasVacacionesCalculados?: number;
  justificacionDiasVacaciones?: string | null;
  observaciones?: string | null;
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
  observaciones: string | null;
  confirmada: boolean;
  /** Cambiaron deudas, vacaciones o datos del trabajador después de calcularla. */
  desactualizada?: boolean;
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
  fondosReservaMensualizados: boolean;
  cargo: string;
  remuneracion: string;
  observaciones: string | null;
  responsable: string | null;
  estado: EstadoExpediente;
  createdAt: string;
  requisitos?: Requisito[];
  liquidacion?: Liquidacion | null;
  aprobaciones?: AprobacionDepartamento[];
  /** Áreas del paz y salvo en orden (solo en GET /expedientes/:id). */
  areas?: string[];
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
  tipoVinculo: TipoVinculo;
  unidad?: string | null;
  jefeInmediato?: string | null;
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
  fondosReservaMensualizados?: boolean;
  observaciones?: string | null;
  responsable?: string | null;
}

export type BienDto = Omit<BienAsignado, 'id' | 'trabajadorId'>;
export type ObligacionDto = Omit<Obligacion, 'id' | 'trabajadorId' | 'valor'> & {
  valor: number | string;
};
export type VacacionDto = Omit<VacacionGozada, 'id' | 'trabajadorId'>;
export type PlantillaDto = Omit<PlantillaRequisito, 'id'>;

export interface PatchRequisitoDto {
  respuesta: RespuestaRequisito | null;
  responsable?: string | null;
  observacion?: string | null;
}

export interface AprobarAreaDto {
  responsable: string;
  cargo?: string | null;
  observacion?: string | null;
}
