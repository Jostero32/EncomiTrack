import { CurrencyPipe, DatePipe, KeyValuePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ApiService } from '../../core/api.service';
import { apiErrorMessage } from '../../core/error.util';
import {
  EntradasLiquidacion,
  EstadoExpediente,
  EstadoRequisito,
  Expediente,
  Liquidacion,
  Requisito,
  RubroLiquidacion,
} from '../../core/models';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-expediente-detalle',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe, KeyValuePipe, RouterLink],
  templateUrl: './expediente-detalle.html',
  styleUrl: './expediente-detalle.scss',
})
export class ExpedienteDetalleComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly sanitizer = inject(DomSanitizer);

  readonly expediente = signal<Expediente | null>(null);
  readonly tab = signal<'general' | 'paz' | 'liq' | 'docs'>('general');
  readonly loading = signal(true);

  readonly showReqModal = signal(false);
  readonly reqTarget = signal<Requisito | null>(null);
  readonly reqAccion = signal<'Aprobado' | 'Rechazado'>('Aprobado');

  readonly showPdf = signal(false);
  readonly pdfTitle = signal('');
  readonly pdfUrl = signal<SafeResourceUrl | null>(null);
  private rawPdfUrl: string | null = null;

  readonly reqForm = this.fb.nonNullable.group({
    responsable: ['', Validators.required],
    observacion: [''],
  });

  readonly liqForm = this.fb.nonNullable.group({
    diasVacacionesPendientesAnteriores: [0, [Validators.min(0)]],
    otrosHaberes: this.fb.array([] as ReturnType<ExpedienteDetalleComponent['itemGroup']>[]),
    anticipos: this.fb.array([] as ReturnType<ExpedienteDetalleComponent['itemGroup']>[]),
    otrasDeducciones: this.fb.array(
      [] as ReturnType<ExpedienteDetalleComponent['itemGroup']>[],
    ),
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.reload(id);
  }

  get soloLectura(): boolean {
    return this.expediente()?.estado === 'Finalizado';
  }

  get requisitosAprobados(): number {
    return (this.expediente()?.requisitos ?? []).filter((r) => r.estado === 'Aprobado')
      .length;
  }

  get totalRequisitos(): number {
    return this.expediente()?.requisitos?.length ?? 6;
  }

  get todosAprobados(): boolean {
    const reqs = this.expediente()?.requisitos ?? [];
    return reqs.length > 0 && reqs.every((r) => r.estado === 'Aprobado');
  }

  get puedeFinalizar(): boolean {
    const e = this.expediente();
    return (
      !!e &&
      e.estado === 'Paz y salvo aprobado' &&
      !!e.liquidacion?.confirmada
    );
  }

  get puedeVerPazSalvoPdf(): boolean {
    const e = this.expediente();
    return !!e && e.estado !== 'En proceso';
  }

  get puedeVerLiquidacionPdf(): boolean {
    return !!this.expediente()?.liquidacion;
  }

  get otrosHaberes(): FormArray {
    return this.liqForm.controls.otrosHaberes as FormArray;
  }

  get anticipos(): FormArray {
    return this.liqForm.controls.anticipos as FormArray;
  }

  get otrasDeducciones(): FormArray {
    return this.liqForm.controls.otrasDeducciones as FormArray;
  }

  requisitosPorDepto(): Record<string, Requisito[]> {
    const map: Record<string, Requisito[]> = {};
    for (const r of this.expediente()?.requisitos ?? []) {
      (map[r.departamento] ??= []).push(r);
    }
    return map;
  }

  haberes(liq?: Liquidacion | null): RubroLiquidacion[] {
    return (liq?.rubros ?? []).filter((r) => r.tipo === 'haber');
  }

  deducciones(liq?: Liquidacion | null): RubroLiquidacion[] {
    return (liq?.rubros ?? []).filter((r) => r.tipo === 'deduccion');
  }

  badgeClass(estado: EstadoExpediente): string {
    switch (estado) {
      case 'En proceso':
        return 'text-bg-warning';
      case 'Paz y salvo aprobado':
        return 'text-bg-info';
      case 'Finalizado':
        return 'text-bg-success';
      default:
        return 'text-bg-secondary';
    }
  }

  reqBadge(estado: EstadoRequisito): string {
    switch (estado) {
      case 'Aprobado':
        return 'text-bg-success';
      case 'Rechazado':
        return 'text-bg-danger';
      default:
        return 'text-bg-secondary';
    }
  }

  reload(id?: number): void {
    const expedienteId = id ?? this.expediente()?.id;
    if (!expedienteId) return;
    this.loading.set(true);
    this.api.getExpediente(expedienteId).subscribe({
      next: (e) => {
        this.expediente.set(e);
        this.patchLiqForm(e.liquidacion?.entradas);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(apiErrorMessage(err));
      },
    });
  }

  setTab(t: 'general' | 'paz' | 'liq' | 'docs'): void {
    this.tab.set(t);
  }

  openReq(r: Requisito, accion: 'Aprobado' | 'Rechazado'): void {
    if (this.soloLectura) return;
    this.reqTarget.set(r);
    this.reqAccion.set(accion);
    this.reqForm.reset({
      responsable: r.responsable ?? '',
      observacion: r.observacion ?? '',
    });
    this.showReqModal.set(true);
  }

  closeReq(): void {
    this.showReqModal.set(false);
  }

  saveReq(): void {
    const r = this.reqTarget();
    if (!r) return;
    if (this.reqForm.controls.responsable.invalid) {
      this.reqForm.markAllAsTouched();
      return;
    }
    const observacion = this.reqForm.controls.observacion.value?.trim() || null;
    if (this.reqAccion() === 'Rechazado' && !observacion) {
      this.toast.error('Observación obligatoria al rechazar');
      return;
    }
    this.api
      .patchRequisito(r.id, {
        estado: this.reqAccion(),
        responsable: this.reqForm.controls.responsable.value,
        observacion,
      })
      .subscribe({
        next: () => {
          this.toast.success(`Requisito ${this.reqAccion().toLowerCase()}`);
          this.showReqModal.set(false);
          this.reload();
        },
        error: (err) => this.toast.error(apiErrorMessage(err)),
      });
  }

  aprobarPazSalvo(): void {
    const e = this.expediente();
    if (!e || this.soloLectura) return;
    this.api.aprobarPazSalvo(e.id).subscribe({
      next: () => {
        this.toast.success('Paz y salvo aprobado');
        this.reload();
      },
      error: (err) => this.toast.error(apiErrorMessage(err)),
    });
  }

  finalizar(): void {
    const e = this.expediente();
    if (!e) return;
    this.api.finalizarExpediente(e.id).subscribe({
      next: () => {
        this.toast.success('Expediente finalizado');
        this.reload();
      },
      error: (err) => this.toast.error(apiErrorMessage(err)),
    });
  }

  itemGroup(item?: { concepto?: string; valor?: number | string; justificacion?: string }) {
    return this.fb.nonNullable.group({
      concepto: [item?.concepto ?? '', Validators.required],
      valor: [Number(item?.valor ?? 0), [Validators.required, Validators.min(0.01)]],
      justificacion: [item?.justificacion ?? '', Validators.required],
    });
  }

  addItem(array: FormArray): void {
    array.push(this.itemGroup());
  }

  removeItem(array: FormArray, index: number): void {
    array.removeAt(index);
  }

  private patchLiqForm(entradas?: EntradasLiquidacion | null): void {
    this.otrosHaberes.clear();
    this.anticipos.clear();
    this.otrasDeducciones.clear();
    this.liqForm.patchValue({
      diasVacacionesPendientesAnteriores:
        entradas?.diasVacacionesPendientesAnteriores ?? 0,
    });
    for (const i of entradas?.otrosHaberes ?? []) this.otrosHaberes.push(this.itemGroup(i));
    for (const i of entradas?.anticipos ?? []) this.anticipos.push(this.itemGroup(i));
    for (const i of entradas?.otrasDeducciones ?? [])
      this.otrasDeducciones.push(this.itemGroup(i));
  }

  private entradasFromForm(): EntradasLiquidacion {
    const v = this.liqForm.getRawValue();
    return {
      diasVacacionesPendientesAnteriores: Number(v.diasVacacionesPendientesAnteriores) || 0,
      otrosHaberes: v.otrosHaberes,
      anticipos: v.anticipos,
      otrasDeducciones: v.otrasDeducciones,
    };
  }

  calcular(): void {
    const e = this.expediente();
    if (!e || this.soloLectura || e.liquidacion?.confirmada) return;
    this.api.calcularLiquidacion(e.id, this.entradasFromForm()).subscribe({
      next: () => {
        this.toast.success('Liquidación calculada');
        this.reload();
      },
      error: (err) => this.toast.error(apiErrorMessage(err)),
    });
  }

  confirmarLiq(): void {
    const e = this.expediente();
    if (!e || this.soloLectura) return;
    this.api.confirmarLiquidacion(e.id).subscribe({
      next: () => {
        this.toast.success('Liquidación confirmada');
        this.reload();
      },
      error: (err) => this.toast.error(apiErrorMessage(err)),
    });
  }

  verPdf(tipo: 'paz' | 'liq'): void {
    const e = this.expediente();
    if (!e) return;
    const req =
      tipo === 'paz' ? this.api.getPdfPazSalvo(e.id) : this.api.getPdfLiquidacion(e.id);
    req.subscribe({
      next: (blob) => {
        if (this.rawPdfUrl) URL.revokeObjectURL(this.rawPdfUrl);
        this.rawPdfUrl = URL.createObjectURL(blob);
        this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.rawPdfUrl));
        this.pdfTitle.set(tipo === 'paz' ? 'Paz y salvo' : 'Liquidación');
        this.showPdf.set(true);
      },
      error: async (err) => {
        let msg = apiErrorMessage(err);
        if (err?.error instanceof Blob) {
          try {
            const text = await err.error.text();
            const parsed = JSON.parse(text);
            if (parsed?.message) msg = parsed.message;
          } catch {
            /* ignore */
          }
        }
        this.toast.error(msg);
      },
    });
  }

  descargarPdf(tipo: 'paz' | 'liq'): void {
    const e = this.expediente();
    if (!e) return;
    const req =
      tipo === 'paz' ? this.api.getPdfPazSalvo(e.id) : this.api.getPdfLiquidacion(e.id);
    const name =
      tipo === 'paz'
        ? `paz-salvo-${e.numero}.pdf`
        : `liquidacion-${e.numero}.pdf`;
    req.subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
        this.toast.success('Descarga iniciada');
      },
      error: async (err) => {
        let msg = apiErrorMessage(err);
        if (err?.error instanceof Blob) {
          try {
            const text = await err.error.text();
            const parsed = JSON.parse(text);
            if (parsed?.message) msg = parsed.message;
          } catch {
            /* ignore */
          }
        }
        this.toast.error(msg);
      },
    });
  }

  closePdf(): void {
    this.showPdf.set(false);
    if (this.rawPdfUrl) {
      URL.revokeObjectURL(this.rawPdfUrl);
      this.rawPdfUrl = null;
    }
    this.pdfUrl.set(null);
  }
}
