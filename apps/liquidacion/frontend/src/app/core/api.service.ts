import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AprobarAreaDto,
  BienAsignado,
  BienDto,
  CrearExpedienteDto,
  CrearTrabajadorDto,
  DashboardData,
  Documento,
  DocumentosFaltantes,
  Empresa,
  EntradasLiquidacion,
  Expediente,
  Liquidacion,
  Obligacion,
  ObligacionDto,
  PatchRequisitoDto,
  PlantillaDto,
  PlantillaRequisito,
  Requisito,
  ResumenVacaciones,
  TipoDocumento,
  Trabajador,
  VacacionDto,
  VacacionGozada,
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  /** Relativa al <base href>: /api en desarrollo, /liquidacion/api publicada. */
  private readonly base = 'api';

  getEmpresa(): Observable<Empresa> {
    return this.http.get<Empresa>(`${this.base}/empresa`);
  }

  updateEmpresa(data: Omit<Empresa, 'id'>): Observable<Empresa> {
    return this.http.put<Empresa>(`${this.base}/empresa`, data);
  }

  getTrabajadores(q?: string): Observable<Trabajador[]> {
    let params = new HttpParams();
    if (q) params = params.set('q', q);
    return this.http.get<Trabajador[]>(`${this.base}/trabajadores`, { params });
  }

  getTrabajador(id: number): Observable<Trabajador> {
    return this.http.get<Trabajador>(`${this.base}/trabajadores/${id}`);
  }

  createTrabajador(data: CrearTrabajadorDto): Observable<Trabajador> {
    return this.http.post<Trabajador>(`${this.base}/trabajadores`, data);
  }

  updateTrabajador(
    id: number,
    data: Partial<CrearTrabajadorDto>,
  ): Observable<Trabajador> {
    return this.http.put<Trabajador>(`${this.base}/trabajadores/${id}`, data);
  }

  deleteTrabajador(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/trabajadores/${id}`);
  }

  getExpedientesTrabajador(id: number): Observable<Expediente[]> {
    return this.http.get<Expediente[]>(
      `${this.base}/trabajadores/${id}/expedientes`,
    );
  }

  // ---- Bienes y accesos ----
  getBienes(trabajadorId: number): Observable<BienAsignado[]> {
    return this.http.get<BienAsignado[]>(`${this.base}/trabajadores/${trabajadorId}/bienes`);
  }

  saveBien(trabajadorId: number, data: BienDto, id?: number): Observable<BienAsignado> {
    const url = `${this.base}/trabajadores/${trabajadorId}/bienes`;
    return id
      ? this.http.put<BienAsignado>(`${url}/${id}`, data)
      : this.http.post<BienAsignado>(url, data);
  }

  deleteBien(trabajadorId: number, id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/trabajadores/${trabajadorId}/bienes/${id}`);
  }

  // ---- Obligaciones ----
  getObligaciones(trabajadorId: number): Observable<Obligacion[]> {
    return this.http.get<Obligacion[]>(
      `${this.base}/trabajadores/${trabajadorId}/obligaciones`,
    );
  }

  saveObligacion(
    trabajadorId: number,
    data: ObligacionDto,
    id?: number,
  ): Observable<Obligacion> {
    const url = `${this.base}/trabajadores/${trabajadorId}/obligaciones`;
    return id
      ? this.http.put<Obligacion>(`${url}/${id}`, data)
      : this.http.post<Obligacion>(url, data);
  }

  deleteObligacion(trabajadorId: number, id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/trabajadores/${trabajadorId}/obligaciones/${id}`,
    );
  }

  // ---- Vacaciones ----
  getVacaciones(trabajadorId: number, fechaCorte?: string): Observable<ResumenVacaciones> {
    let params = new HttpParams();
    if (fechaCorte) params = params.set('fechaCorte', fechaCorte);
    return this.http.get<ResumenVacaciones>(
      `${this.base}/trabajadores/${trabajadorId}/vacaciones`,
      { params },
    );
  }

  saveVacacion(
    trabajadorId: number,
    data: VacacionDto,
    id?: number,
  ): Observable<VacacionGozada> {
    const url = `${this.base}/trabajadores/${trabajadorId}/vacaciones`;
    return id
      ? this.http.put<VacacionGozada>(`${url}/${id}`, data)
      : this.http.post<VacacionGozada>(url, data);
  }

  deleteVacacion(trabajadorId: number, id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/trabajadores/${trabajadorId}/vacaciones/${id}`,
    );
  }

  // ---- Plantilla del paz y salvo ----
  getPlantilla(): Observable<PlantillaRequisito[]> {
    return this.http.get<PlantillaRequisito[]>(`${this.base}/plantilla-requisitos`);
  }

  savePlantilla(data: PlantillaDto, id?: number): Observable<PlantillaRequisito> {
    const url = `${this.base}/plantilla-requisitos`;
    return id
      ? this.http.put<PlantillaRequisito>(`${url}/${id}`, data)
      : this.http.post<PlantillaRequisito>(url, data);
  }

  deletePlantilla(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/plantilla-requisitos/${id}`);
  }

  getExpedientes(q?: string, estado?: string): Observable<Expediente[]> {
    let params = new HttpParams();
    if (q) params = params.set('q', q);
    if (estado) params = params.set('estado', estado);
    return this.http.get<Expediente[]>(`${this.base}/expedientes`, { params });
  }

  getExpediente(id: number): Observable<Expediente> {
    return this.http.get<Expediente>(`${this.base}/expedientes/${id}`);
  }

  createExpediente(data: CrearExpedienteDto): Observable<Expediente> {
    return this.http.post<Expediente>(`${this.base}/expedientes`, data);
  }

  updateExpediente(
    id: number,
    data: Partial<CrearExpedienteDto>,
  ): Observable<Expediente> {
    return this.http.put<Expediente>(`${this.base}/expedientes/${id}`, data);
  }

  reabrirPazSalvo(id: number): Observable<Expediente> {
    return this.http.post<Expediente>(`${this.base}/expedientes/${id}/reabrir-paz-salvo`, {});
  }

  aprobarPazSalvo(id: number): Observable<Expediente> {
    return this.http.post<Expediente>(
      `${this.base}/expedientes/${id}/aprobar-paz-salvo`,
      {},
    );
  }

  finalizarExpediente(id: number): Observable<Expediente> {
    return this.http.post<Expediente>(
      `${this.base}/expedientes/${id}/finalizar`,
      {},
    );
  }

  patchRequisito(id: number, data: PatchRequisitoDto): Observable<Requisito> {
    return this.http.patch<Requisito>(`${this.base}/requisitos/${id}`, data);
  }

  private areaUrl(id: number, departamento: string): string {
    return `${this.base}/expedientes/${id}/departamentos/${encodeURIComponent(departamento)}`;
  }

  marcarAreaEsperado(id: number, departamento: string): Observable<Expediente> {
    return this.http.post<Expediente>(`${this.areaUrl(id, departamento)}/marcar-esperado`, {});
  }

  certificarArea(id: number, departamento: string, data: AprobarAreaDto): Observable<Expediente> {
    return this.http.post<Expediente>(`${this.areaUrl(id, departamento)}/aprobar`, data);
  }

  revertirArea(id: number, departamento: string): Observable<Expediente> {
    return this.http.delete<Expediente>(`${this.areaUrl(id, departamento)}/aprobar`);
  }

  regenerarRequisitos(id: number): Observable<{ eliminados: number; creados: number; expediente: Expediente }> {
    return this.http.post<{ eliminados: number; creados: number; expediente: Expediente }>(
      `${this.base}/expedientes/${id}/regenerar-requisitos`,
      {},
    );
  }

  calcularLiquidacion(
    expedienteId: number,
    entradas: EntradasLiquidacion,
  ): Observable<Liquidacion> {
    return this.http.post<Liquidacion>(
      `${this.base}/expedientes/${expedienteId}/liquidacion/calcular`,
      entradas,
    );
  }

  actualizarLiquidacion(
    expedienteId: number,
    entradas: EntradasLiquidacion,
  ): Observable<Liquidacion> {
    return this.http.put<Liquidacion>(
      `${this.base}/expedientes/${expedienteId}/liquidacion`,
      entradas,
    );
  }

  confirmarLiquidacion(expedienteId: number): Observable<Liquidacion> {
    return this.http.post<Liquidacion>(
      `${this.base}/expedientes/${expedienteId}/liquidacion/confirmar`,
      {},
    );
  }

  getLiquidacion(expedienteId: number): Observable<Liquidacion> {
    return this.http.get<Liquidacion>(
      `${this.base}/expedientes/${expedienteId}/liquidacion`,
    );
  }

  getPdfPazSalvo(expedienteId: number): Observable<Blob> {
    return this.http.get(
      `${this.base}/expedientes/${expedienteId}/pdf/paz-salvo`,
      { responseType: 'blob' },
    );
  }

  getPdfLiquidacion(expedienteId: number): Observable<Blob> {
    return this.http.get(
      `${this.base}/expedientes/${expedienteId}/pdf/liquidacion`,
      { responseType: 'blob' },
    );
  }

  getPdfAnexoVacaciones(expedienteId: number): Observable<Blob> {
    return this.http.get(
      `${this.base}/expedientes/${expedienteId}/pdf/anexo-vacaciones`,
      { responseType: 'blob' },
    );
  }

  getDashboard(): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${this.base}/dashboard`);
  }

  cargarDemo(): Observable<{ empresa: Empresa; trabajador: Trabajador }> {
    return this.http.post<{ empresa: Empresa; trabajador: Trabajador }>(
      `${this.base}/demo/cargar`,
      {},
    );
  }

  // ---- Documentos del expediente ----
  getDocumentos(expedienteId: number): Observable<Documento[]> {
    return this.http.get<Documento[]>(
      `${this.base}/expedientes/${expedienteId}/documentos`,
    );
  }

  getDocumentosFaltantes(expedienteId: number): Observable<DocumentosFaltantes> {
    return this.http.get<DocumentosFaltantes>(
      `${this.base}/expedientes/${expedienteId}/documentos/faltantes`,
    );
  }

  uploadDocumento(
    expedienteId: number,
    data: {
      archivo: File;
      tipo: TipoDocumento;
      descripcion?: string;
      requisitoId?: number | null;
    },
  ): Observable<Documento> {
    const form = new FormData();
    form.append('archivo', data.archivo);
    form.append('tipo', data.tipo);
    if (data.descripcion) form.append('descripcion', data.descripcion);
    if (data.requisitoId != null) {
      form.append('requisitoId', String(data.requisitoId));
    }
    return this.http.post<Documento>(
      `${this.base}/expedientes/${expedienteId}/documentos`,
      form,
    );
  }

  deleteDocumento(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/documentos/${id}`);
  }

  urlDocumentoVer(id: number): string {
    return `${this.base}/documentos/${id}/ver`;
  }

  urlDocumentoDescargar(id: number): string {
    return `${this.base}/documentos/${id}/descargar`;
  }
}
