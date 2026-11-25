import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { apiErrorMessage } from '../../core/error.util';
import {
  BienAsignado,
  DEPARTAMENTOS_RESPONSABLES,
  DepartamentoResponsable,
  ESTADOS_BIEN,
  ESTADOS_OBLIGACION,
  EstadoBien,
  EstadoObligacion,
  Expediente,
  Obligacion,
  ResumenVacaciones,
  TIPOS_BIEN,
  TIPOS_OBLIGACION,
  TipoBien,
  TipoObligacion,
  Trabajador,
  VacacionGozada,
} from '../../core/models';
import { ToastService } from '../../core/toast.service';

type Tab = 'datos' | 'bienes' | 'obligaciones' | 'vacaciones' | 'expedientes';
type Modal = 'bien' | 'obligacion' | 'vacacion' | null;

@Component({
  selector: 'app-trabajador-detalle',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe, DecimalPipe, RouterLink],
  templateUrl: './trabajador-detalle.html',
})
export class TrabajadorDetalleComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  readonly tiposBien = TIPOS_BIEN;
  readonly departamentos = DEPARTAMENTOS_RESPONSABLES;
  readonly estadosBien = ESTADOS_BIEN;
  readonly tiposObligacion = TIPOS_OBLIGACION;
  readonly estadosObligacion = ESTADOS_OBLIGACION;

  readonly trabajador = signal<Trabajador | null>(null);
  readonly bienes = signal<BienAsignado[]>([]);
  readonly obligaciones = signal<Obligacion[]>([]);
  readonly vacaciones = signal<ResumenVacaciones | null>(null);
  readonly expedientes = signal<Expediente[]>([]);
  readonly tab = signal<Tab>('datos');
  readonly modal = signal<Modal>(null);
  readonly editingId = signal<number | null>(null);
  readonly fechaCorte = signal('');

  readonly bienesAsignados = computed(
    () => this.bienes().filter((b) => b.estado === 'Asignado').length,
  );
  readonly totalPendiente = computed(() =>
    this.obligaciones()
      .filter((o) => o.estado !== 'Pagada')
      .reduce((acc, o) => acc + Number(o.valor), 0),
  );

  readonly bienForm = this.fb.nonNullable.group({
    tipo: ['Equipo' as TipoBien, Validators.required],
    descripcion: ['', Validators.required],
    codigoSerie: [''],
    departamentoResponsable: ['Sistemas' as DepartamentoResponsable, Validators.required],
    fechaAsignacion: [''],
    estado: ['Asignado' as EstadoBien, Validators.required],
    fechaDevolucion: [''],
    observacion: [''],
  });

  readonly obligacionForm = this.fb.nonNullable.group({
    tipo: ['Anticipo' as TipoObligacion, Validators.required],
    concepto: ['', Validators.required],
    valor: [0, [Validators.required, Validators.min(0.01)]],
    fecha: ['', Validators.required],
    estado: ['Pendiente' as EstadoObligacion, Validators.required],
    justificacion: [''],
  });

  readonly vacacionForm = this.fb.nonNullable.group({
    fechaInicio: ['', Validators.required],
    dias: [1, [Validators.required, Validators.min(1)]],
    documento: [''],
    observacion: [''],
  });

  /** Expediente que aún no está finalizado (uno por trabajador). */
  readonly expedienteAbierto = computed(
    () => this.expedientes().find((e) => e.estado !== 'Finalizado') ?? null,
  );

  private get id(): number {
    return Number(this.route.snapshot.paramMap.get('id'));
  }

  ngOnInit(): void {
    this.api.getTrabajador(this.id).subscribe({
      next: (t) => this.trabajador.set(t),
      error: (err) => this.toast.error(apiErrorMessage(err)),
    });
    this.loadBienes();
    this.loadObligaciones();
    this.loadVacaciones();
    this.api.getExpedientesTrabajador(this.id).subscribe({
      next: (list) => this.expedientes.set(list),
      error: (err) => this.toast.error(apiErrorMessage(err)),
    });
  }

  setTab(t: Tab): void {
    this.tab.set(t);
  }

  loadBienes(): void {
    this.api.getBienes(this.id).subscribe({
      next: (list) => this.bienes.set(list),
      error: (err) => this.toast.error(apiErrorMessage(err)),
    });
  }

  loadObligaciones(): void {
    this.api.getObligaciones(this.id).subscribe({
      next: (list) => this.obligaciones.set(list),
      error: (err) => this.toast.error(apiErrorMessage(err)),
    });
  }

  loadVacaciones(): void {
    this.api.getVacaciones(this.id, this.fechaCorte() || undefined).subscribe({
      next: (v) => {
        this.vacaciones.set(v);
        this.fechaCorte.set(v.fechaCorte);
      },
      error: (err) => this.toast.error(apiErrorMessage(err)),
    });
  }

  cambiarFechaCorte(value: string): void {
    this.fechaCorte.set(value);
    if (value) this.loadVacaciones();
  }

  bienBadge(estado: EstadoBien): string {
    return estado === 'Asignado'
      ? 'text-bg-warning'
      : estado === 'Devuelto'
        ? 'text-bg-success'
        : 'text-bg-secondary';
  }

  // ---------- modales ----------
  openBien(b?: BienAsignado): void {
    this.editingId.set(b?.id ?? null);
    this.bienForm.reset({
      tipo: b?.tipo ?? 'Equipo',
      descripcion: b?.descripcion ?? '',
      codigoSerie: b?.codigoSerie ?? '',
      departamentoResponsable: b?.departamentoResponsable ?? 'Sistemas',
      fechaAsignacion: b?.fechaAsignacion ?? '',
      estado: b?.estado ?? 'Asignado',
      fechaDevolucion: b?.fechaDevolucion ?? '',
      observacion: b?.observacion ?? '',
    });
    this.modal.set('bien');
  }

  openObligacion(o?: Obligacion): void {
    this.editingId.set(o?.id ?? null);
    this.obligacionForm.reset({
      tipo: o?.tipo ?? 'Anticipo',
      concepto: o?.concepto ?? '',
      valor: Number(o?.valor ?? 0),
      fecha: o?.fecha ?? '',
      estado: o?.estado ?? 'Pendiente',
      justificacion: o?.justificacion ?? '',
    });
    this.modal.set('obligacion');
  }

  openVacacion(v?: VacacionGozada): void {
    this.editingId.set(v?.id ?? null);
    this.vacacionForm.reset({
      fechaInicio: v?.fechaInicio ?? '',
      dias: v?.dias ?? 1,
      documento: v?.documento ?? '',
      observacion: v?.observacion ?? '',
    });
    this.modal.set('vacacion');
  }

  closeModal(): void {
    this.modal.set(null);
  }

  saveBien(): void {
    if (this.bienForm.invalid) {
      this.bienForm.markAllAsTouched();
      return;
    }
    const v = this.bienForm.getRawValue();
    this.persist(
      this.api.saveBien(
        this.id,
        {
          ...v,
          codigoSerie: v.codigoSerie || null,
          fechaAsignacion: v.fechaAsignacion || null,
          fechaDevolucion: v.fechaDevolucion || null,
          observacion: v.observacion || null,
        },
        this.editingId() ?? undefined,
      ),
      'Bien',
      () => this.loadBienes(),
    );
  }

  saveObligacion(): void {
    if (this.obligacionForm.invalid) {
      this.obligacionForm.markAllAsTouched();
      return;
    }
    const v = this.obligacionForm.getRawValue();
    this.persist(
      this.api.saveObligacion(
        this.id,
        { ...v, justificacion: v.justificacion || null },
        this.editingId() ?? undefined,
      ),
      'Obligación',
      () => this.loadObligaciones(),
    );
  }

  saveVacacion(): void {
    if (this.vacacionForm.invalid) {
      this.vacacionForm.markAllAsTouched();
      return;
    }
    const v = this.vacacionForm.getRawValue();
    this.persist(
      this.api.saveVacacion(
        this.id,
        {
          ...v,
          dias: Number(v.dias),
          documento: v.documento || null,
          observacion: v.observacion || null,
        },
        this.editingId() ?? undefined,
      ),
      'Registro de vacaciones',
      () => this.loadVacaciones(),
    );
  }

  deleteBien(b: BienAsignado): void {
    this.remove(this.api.deleteBien(this.id, b.id), 'Bien eliminado', () => this.loadBienes());
  }

  deleteObligacion(o: Obligacion): void {
    this.remove(this.api.deleteObligacion(this.id, o.id), 'Obligación eliminada', () =>
      this.loadObligaciones(),
    );
  }

  deleteVacacion(v: VacacionGozada): void {
    this.remove(this.api.deleteVacacion(this.id, v.id), 'Registro eliminado', () =>
      this.loadVacaciones(),
    );
  }

  /** Muestra lo que cambió en el expediente abierto (paz y salvo / liquidación). */
  private avisarExpediente(r: unknown): void {
    const aviso = (r as { avisoExpediente?: string } | null)?.avisoExpediente;
    if (aviso) this.toast.info(aviso);
  }

  private persist(req: Observable<unknown>, label: string, reload: () => void): void {
    const editing = !!this.editingId();
    req.subscribe({
      next: (r) => {
        this.toast.success(`${label} ${editing ? 'actualizado' : 'registrado'}`);
        this.avisarExpediente(r);
        this.modal.set(null);
        reload();
      },
      error: (err) => this.toast.error(apiErrorMessage(err)),
    });
  }

  private remove(req: Observable<unknown>, msg: string, reload: () => void): void {
    if (!confirm('¿Eliminar el registro?')) return;
    req.subscribe({
      next: (r) => {
        this.toast.success(msg);
        this.avisarExpediente(r);
        reload();
      },
      error: (err) => this.toast.error(apiErrorMessage(err)),
    });
  }
}
