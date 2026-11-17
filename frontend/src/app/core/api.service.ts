import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CrearExpedienteDto,
  CrearTrabajadorDto,
  DashboardData,
  Empresa,
  EntradasLiquidacion,
  Expediente,
  Liquidacion,
  PatchRequisitoDto,
  Requisito,
  Trabajador,
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api';

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

  getDashboard(): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${this.base}/dashboard`);
  }

  cargarDemo(): Observable<{ empresa: Empresa; trabajador: Trabajador }> {
    return this.http.post<{ empresa: Empresa; trabajador: Trabajador }>(
      `${this.base}/demo/cargar`,
      {},
    );
  }
}
