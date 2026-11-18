import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import {
  Component,
  HostListener,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, filter } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { apiErrorMessage } from '../../core/error.util';
import {
  AprobacionDepartamento,
  Documento,
  EntradasLiquidacion,
  EstadoExpediente,
  Expediente,
  Liquidacion,
  Obligacion,
  Requisito,
  ORDEN_AREAS,
  RespuestaRequisito,
  ResumenVacaciones,
  SBU,
  RubroLiquidacion,
  TIPOS_DOCUMENTO,
  TipoDocumento,
} from '../../core/models';
import { ToastService } from '../../core/toast.service';

export type EstadoArea = 'Pendiente' | 'Listo para certificar' | 'Certificado';

export interface GrupoDepartamento {
  departamento: string;
  requisitos: Requisito[];
  cumplidos: number;
  respondidos: number;
  total: number;
  /** Todos los ítems cumplen. */
  listo: boolean;
  aprobacion: AprobacionDepartamento | null;
  estado: EstadoArea;
}

interface Confirmacion {
  titulo: string;
  mensaje: string;
  boton: string;
  peligro?: boolean;
  accion: () => void;
}

const LS_RESPONSABLES = 'ps.responsables';
const LS_CARGOS = 'ps.cargos';

function leerLista(clave: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(clave) ?? '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function guardarEnLista(clave: string, valor: string): string[] {
  const lista = [valor, ...leerLista(clave).filter((x) => x !== valor)].slice(0, 20);
  try {
    localStorage.setItem(clave, JSON.stringify(lista));
  } catch {
    /* sin almacenamiento: la lista vive solo en memoria */
  }
  return lista;
}

function rangoArea(d: string): number {
  const i = (ORDEN_AREAS as readonly string[]).indexOf(d);
  if (i >= 0) return i === ORDEN_AREAS.length - 1 ? 1000 : i;
  return 500;
}

export interface GrupoDocumento {
  tipo: TipoDocumento;
  documentos: Documento[];
}

@Component({
  selector: 'app-expediente-detalle',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, CurrencyPipe, DatePipe, DecimalPipe, RouterLink],
  templateUrl: './expediente-detalle.html',
  styleUrl: './expediente-detalle.scss',
})
export class ExpedienteDetalleComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly sanitizer = inject(DomSanitizer);

  readonly tiposDocumento = TIPOS_DOCUMENTO;

  readonly expediente = signal<Expediente | null>(null);
  readonly tab = signal<'general' | 'paz' | 'liq' | 'docs' | 'digital'>('general');
  readonly loading = signal(true);

  readonly opciones: RespuestaRequisito[] = ['SI', 'NO', 'N/A'];
  readonly showReqModal = signal(false);
  readonly reqTarget = signal<Requisito | null>(null);
  /** Respuesta que se registrará; null = solo se edita la observación. */
  readonly reqRespuesta = signal<RespuestaRequisito | null>('SI');
  readonly obsError = signal<string | null>(null);

  readonly areaIdx = signal(0);
  readonly certForm = signal<{ responsable: string; cargo: string }>({ responsable: '', cargo: '' });
  readonly certError = signal<string | null>(null);
  readonly responsablesPrevios = signal<string[]>(leerLista(LS_RESPONSABLES));
  readonly cargosPrevios = signal<string[]>(leerLista(LS_CARGOS));
  readonly confirmacion = signal<Confirmacion | null>(null);
  readonly dropRequisitoId = signal<number | null>(null);
  readonly dropGeneral = signal(false);
  readonly calculando = signal(false);
  /** Evita recalcular mientras se cargan en el formulario las entradas guardadas. */
  private cargandoEntradas = false;

  readonly estadoLiquidacion = computed(() => {
    const liq = this.expediente()?.liquidacion;
    if (!liq) return { texto: 'Sin calcular', clase: 'text-bg-secondary', icono: 'bi-hourglass' };
    if (liq.confirmada) return { texto: 'Confirmada', clase: 'text-bg-success', icono: 'bi-lock-fill' };
    if (liq.desactualizada) return { texto: 'Desactualizada', clase: 'text-bg-warning', icono: 'bi-exclamation-triangle' };
    return { texto: 'Borrador', clase: 'text-bg-light border', icono: 'bi-pencil' };
  });

  /** Meses calendario completos y días (incluye el día de salida), como en el PDF. */
  readonly tiempoTrabajado = computed(() => {
    const e = this.expediente();
    if (!e) return { meses: 0, dias: 0 };
    const [yi, mi, di] = e.fechaIngreso.slice(0, 10).split('-').map(Number);
    const [ys, ms, ds] = e.fechaSalida.slice(0, 10).split('-').map(Number);
    let meses = (ys - yi) * 12 + (ms - mi);
    if (ds < di) meses -= 1;
    meses = Math.max(meses, 0);
    const ancla = Date.UTC(yi, mi - 1 + meses, di);
    const dias = Math.round((Date.UTC(ys, ms - 1, ds) - ancla) / 86_400_000) + 1;
    return { meses, dias: Math.max(dias, 0) };
  });

  readonly valoresUnitarios = computed(() => {
    const rem = Number(this.expediente()?.remuneracion ?? 0);
    return [
      { concepto: 'Sueldo', mes: rem, dia: rem / 30 },
      { concepto: 'Décimo tercero', mes: rem / 12, dia: rem / 12 / 30 },
      { concepto: 'Décimo cuarto', mes: SBU / 12, dia: SBU / 12 / 30 },
      { concepto: 'Vacaciones', mes: rem / 24, dia: rem / 30 },
    ];
  });

  /** Evidencias subidas (excluye los PDF archivados por el sistema). */
  readonly evidencias = computed(() =>
    this.documentos().filter((d) => d.tipo !== 'Generado por el sistema'),
  );

  readonly evidenciasPorTipo = computed(() => {
    const map = new Map<TipoDocumento, Documento[]>();
    for (const d of this.evidencias()) {
      if (!map.has(d.tipo)) map.set(d.tipo, []);
      map.get(d.tipo)!.push(d);
    }
    return [...map.entries()].map(([tipo, documentos]) => ({ tipo, documentos }));
  });

  /** Tarjetas de los PDF del sistema con su estado. */
  readonly pdfsSistema = computed(() => {
    const e = this.expediente();
    const fin = e?.estado === 'Finalizado';
    const archivado = { estado: 'Copia archivada', estadoClase: 'text-bg-success', estadoIcono: 'bi-archive' };
    const disponible = { estado: 'Disponible', estadoClase: 'text-bg-primary', estadoIcono: 'bi-check2' };
    const bloqueado = { estado: 'Aún no disponible', estadoClase: 'text-bg-secondary', estadoIcono: 'bi-lock' };
    const liq = e?.liquidacion;
    return [
      {
        tipo: 'paz' as const,
        titulo: 'Paz y salvo',
        icono: 'bi-clipboard-check',
        disponible: this.puedeVerPazSalvoPdf,
        ...(fin ? archivado : this.puedeVerPazSalvoPdf ? disponible : bloqueado),
        ayuda: this.puedeVerPazSalvoPdf
          ? 'Certificado con la firma de cada área y del trabajador.'
          : 'Se habilita al aprobar el paz y salvo.',
      },
      {
        tipo: 'liq' as const,
        titulo: 'Liquidación de haberes',
        icono: 'bi-calculator',
        disponible: this.puedeVerLiquidacionPdf,
        ...(fin
          ? archivado
          : liq?.confirmada
            ? disponible
            : liq
              ? { estado: 'Borrador', estadoClase: 'text-bg-warning', estadoIcono: 'bi-pencil' }
              : bloqueado),
        ayuda: liq
          ? liq.confirmada
            ? 'Liquidación confirmada, lista para firmar.'
            : 'Vista previa: la liquidación aún no está confirmada.'
          : 'Se habilita al calcular la liquidación.',
      },
      {
        tipo: 'anexo' as const,
        titulo: 'Anexo de vacaciones',
        icono: 'bi-calendar-check',
        disponible: this.puedeVerAnexoVacacionesPdf,
        ...(fin ? archivado : disponible),
        ayuda: 'Períodos, vacaciones gozadas y días a liquidar.',
      },
    ];
  });

  /** Requisitos agrupados por área, en el orden de ORDEN_AREAS. */
  readonly grupos = computed<GrupoDepartamento[]>(() => {
    const e = this.expediente();
    const reqs = e?.requisitos ?? [];
    const orden =
      e?.areas ??
      [...new Set(reqs.map((r) => r.departamento))].sort(
        (a, b) => rangoArea(a) - rangoArea(b) || a.localeCompare(b, 'es'),
      );
    const aprobaciones = new Map((e?.aprobaciones ?? []).map((a) => [a.departamento, a]));
    return orden.map((departamento): GrupoDepartamento => {
      const requisitos = reqs
        .filter((r) => r.departamento === departamento)
        .sort((a, b) => a.orden - b.orden || a.id - b.id);
      const cumplidos = requisitos.filter((r) => r.cumple).length;
      const listo = requisitos.length > 0 && cumplidos === requisitos.length;
      const aprobacion = aprobaciones.get(departamento) ?? null;
      return {
        departamento,
        requisitos,
        cumplidos,
        respondidos: requisitos.filter((r) => r.respuesta !== null).length,
        total: requisitos.length,
        listo,
        aprobacion,
        estado: aprobacion ? 'Certificado' : listo ? 'Listo para certificar' : 'Pendiente',
      };
    });
  });

  readonly areaActual = computed(() => {
    const g = this.grupos();
    return g.length ? g[Math.min(this.areaIdx(), g.length - 1)] : null;
  });

  readonly areasCertificadas = computed(() => this.grupos().filter((g) => g.aprobacion).length);

  /** Pendientes del paz y salvo: ítems sin cumplir, o áreas por certificar. */
  readonly pendientesPaz = computed(() => {
    if (this.expediente()?.estado !== 'En proceso') return 0;
    const g = this.grupos();
    const sinCumplir = g.reduce((acc, x) => acc + x.total - x.cumplidos, 0);
    return sinCumplir || g.filter((x) => !x.aprobacion).length;
  });

  readonly liquidacionPendiente = computed(() => {
    const e = this.expediente();
    return !!e && e.estado === 'Paz y salvo aprobado' && !e.liquidacion?.confirmada;
  });

  readonly pasosProceso = computed(() => {
    const e = this.expediente();
    const aprobado = !!e && e.estado !== 'En proceso';
    const liqOk = !!e?.liquidacion?.confirmada;
    const fin = e?.estado === 'Finalizado';
    type Estado = 'completo' | 'actual' | 'pendiente';
    const paso = (nombre: string, completo: boolean, actual: boolean) => ({
      nombre,
      estado: (completo ? 'completo' : actual ? 'actual' : 'pendiente') as Estado,
    });
    return [
      paso('Datos', true, false),
      paso('Paz y salvo', aprobado, !aprobado),
      paso('Liquidación', liqOk, aprobado && !liqOk),
      paso('Documentos', fin, aprobado && liqOk && !fin),
      paso('Finalizado', fin, false),
    ];
  });

  /** Botón principal de la cabecera, según el estado del expediente. */
  readonly siguienteAccion = computed(() => {
    const e = this.expediente();
    if (!e) return null;
    const g = this.grupos();
    if (e.estado === 'En proceso') {
      const sinCumplir = g.reduce((acc, x) => acc + x.total - x.cumplidos, 0);
      if (sinCumplir > 0) {
        return { clave: 'paz', texto: `Completar paz y salvo (${sinCumplir} ${sinCumplir === 1 ? 'pendiente' : 'pendientes'})`, icono: 'bi-clipboard-check', clase: 'btn-primary' };
      }
      const sinCert = g.filter((x) => !x.aprobacion).length;
      if (sinCert > 0) {
        return {
          clave: 'paz',
          texto: sinCert === 1 ? 'Certificar la última área' : `Certificar áreas (${sinCert} pendientes)`,
          icono: 'bi-patch-check',
          clase: 'btn-primary',
        };
      }
      return { clave: 'aprobar', texto: 'Aprobar paz y salvo', icono: 'bi-check2-circle', clase: 'btn-success' };
    }
    if (e.estado === 'Paz y salvo aprobado') {
      if (!e.liquidacion) {
        return { clave: 'liq', texto: 'Calcular liquidación', icono: 'bi-calculator', clase: 'btn-primary' };
      }
      if (e.liquidacion.desactualizada && !e.liquidacion.confirmada) {
        return { clave: 'liq', texto: 'Recalcular liquidación', icono: 'bi-arrow-repeat', clase: 'btn-warning' };
      }
      if (!e.liquidacion.confirmada) {
        return { clave: 'liq', texto: 'Confirmar liquidación', icono: 'bi-calculator', clase: 'btn-primary' };
      }
      return { clave: 'finalizar', texto: 'Finalizar expediente', icono: 'bi-check2-circle', clase: 'btn-success' };
    }
    return { clave: 'docs', texto: 'Ver documentos', icono: 'bi-file-earmark-pdf', clase: 'btn-outline-primary' };
  });

  ejecutarSiguiente(clave: string): void {
    switch (clave) {
      case 'aprobar':
        this.aprobarPazSalvo();
        return;
      case 'finalizar':
        this.confirmacion.set({
          titulo: 'Finalizar expediente',
          mensaje:
            'Se archivarán los PDF de paz y salvo, liquidación y anexo de vacaciones, y el expediente quedará en solo lectura. ¿Continuar?',
          boton: 'Finalizar',
          accion: () => this.finalizar(),
        });
        return;
      case 'paz': {
        this.setTab('paz');
        const i = this.grupos().findIndex((x) => !x.listo || !x.aprobacion);
        this.irArea(i >= 0 ? i : 0);
        return;
      }
      default:
        this.setTab(clave as 'liq' | 'docs');
    }
  }
  readonly vacaciones = signal<ResumenVacaciones | null>(null);
  readonly obligacionesPendientes = signal<Obligacion[]>([]);

  readonly documentos = signal<Documento[]>([]);
  readonly faltantes = signal<TipoDocumento[]>([]);
  readonly showUploadModal = signal(false);
  readonly uploadRequisitoId = signal<number | null>(null);
  readonly selectedFile = signal<File | null>(null);
  readonly uploading = signal(false);

  readonly showDocViewer = signal(false);
  readonly docViewerTitle = signal('');
  readonly docViewerMime = signal('');
  readonly docViewerUrl = signal<SafeResourceUrl | null>(null);
  private rawDocUrl: string | null = null;

  readonly showPdf = signal(false);
  readonly pdfTitle = signal('');
  readonly pdfUrl = signal<SafeResourceUrl | null>(null);
  private rawPdfUrl: string | null = null;

  readonly uploadForm = this.fb.nonNullable.group({
    tipo: ['Otro' as TipoDocumento, Validators.required],
    descripcion: [''],
  });

  readonly reqForm = this.fb.nonNullable.group({
    observacion: [''],
  });

  readonly liqForm = this.fb.nonNullable.group({
    diasVacacionesPendientesAnteriores: [0, [Validators.min(0)]],
    justificacionDiasVacaciones: [''],
    observaciones: [''],
    otrosHaberes: this.fb.array([] as ReturnType<ExpedienteDetalleComponent['itemGroup']>[]),
    anticipos: this.fb.array([] as ReturnType<ExpedienteDetalleComponent['itemGroup']>[]),
    otrasDeducciones: this.fb.array(
      [] as ReturnType<ExpedienteDetalleComponent['itemGroup']>[],
    ),
  });

  constructor() {
    // Recalcula sola la liquidación 500 ms después de cada cambio en los ajustes.
    this.liqForm.valueChanges
      .pipe(
        filter(() => !this.cargandoEntradas),
        debounceTime(500),
        filter(() => {
          const e = this.expediente();
          return (
            !!e?.liquidacion &&
            !this.liqBloqueada &&
            this.liqForm.valid &&
            !(this.diasVacacionesEditados && !this.liqForm.controls.justificacionDiasVacaciones.value.trim())
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.calcular(true));
  }

  esCero(valor: string | number): boolean {
    return Number(valor) === 0;
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'paz' || tab === 'liq' || tab === 'docs') this.tab.set(tab);
    if (tab === 'digital') this.tab.set('docs');
    this.reload(id);
  }

  get soloLectura(): boolean {
    return this.expediente()?.estado === 'Finalizado';
  }

  get requisitosAprobados(): number {
    return (this.expediente()?.requisitos ?? []).filter((r) => r.cumple).length;
  }

  get totalRequisitos(): number {
    return this.expediente()?.requisitos?.length ?? 0;
  }

  get todosAprobados(): boolean {
    const reqs = this.expediente()?.requisitos ?? [];
    return reqs.length > 0 && reqs.every((r) => r.cumple);
  }

  get pazSalvoEditable(): boolean {
    return this.expediente()?.estado === 'En proceso';
  }

  /** Saldo de vacaciones calculado (períodos completos) a la fecha de salida. */
  get saldoVacaciones(): number | null {
    return this.vacaciones()?.saldoPeriodosCompletos ?? null;
  }

  get diasVacacionesEditados(): boolean {
    const saldo = this.saldoVacaciones;
    return (
      saldo !== null &&
      Number(this.liqForm.controls.diasVacacionesPendientesAnteriores.value) !== saldo
    );
  }

  get liqBloqueada(): boolean {
    return this.soloLectura || !!this.expediente()?.liquidacion?.confirmada;
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

  get puedeVerAnexoVacacionesPdf(): boolean {
    return !!this.expediente();
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

  etiquetaOrigen(r: Requisito): string {
    return r.origen === 'Bien' ? 'Inventario' : r.origen === 'Obligacion' ? 'Deuda' : 'Requisito';
  }

  iconoOrigen(r: Requisito): string {
    if (r.origen === 'Obligacion') return 'bi-cash-coin';
    if (r.origen === 'Bien') {
      return r.detalle?.origen === 'Bien' && r.detalle.tipo === 'Equipo' ? 'bi-laptop' : 'bi-box-seam';
    }
    return 'bi-clipboard-check';
  }

  requiereObservacion(r: Requisito | null, respuesta: RespuestaRequisito | null): boolean {
    return !!r && respuesta !== null && (respuesta === 'N/A' || respuesta !== r.respuestaEsperada);
  }

  /** Se puede responder en el área: expediente En proceso y área sin certificar. */
  areaEditable(g: GrupoDepartamento): boolean {
    return this.pazSalvoEditable && !g.aprobacion;
  }

  irArea(i: number): void {
    const n = this.grupos().length;
    if (!n) return;
    this.areaIdx.set(Math.max(0, Math.min(i, n - 1)));
    this.certError.set(null);
    this.prefillCert();
    setTimeout(() => document.getElementById('area-titulo')?.focus());
  }

  /** Alt+← / Alt+→ cambian de área en la pestaña Paz y salvo. */
  @HostListener('document:keydown', ['$event'])
  onKeydown(ev: KeyboardEvent): void {
    if (this.tab() !== 'paz' || !ev.altKey) return;
    if (ev.key === 'ArrowRight') {
      ev.preventDefault();
      this.irArea(this.areaIdx() + 1);
    } else if (ev.key === 'ArrowLeft') {
      ev.preventDefault();
      this.irArea(this.areaIdx() - 1);
    }
  }

  /** Flechas dentro del grupo SÍ / NO / N/A mueven el foco entre opciones. */
  onRadioKey(ev: KeyboardEvent): void {
    if (ev.altKey) return;
    const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
    if (!keys.includes(ev.key)) return;
    const botones = Array.from(
      (ev.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>('button[role="radio"]'),
    );
    const i = botones.indexOf(document.activeElement as HTMLButtonElement);
    const delta = ev.key === 'ArrowRight' || ev.key === 'ArrowDown' ? 1 : -1;
    const sig = botones[(i + delta + botones.length) % botones.length];
    ev.preventDefault();
    sig?.focus();
  }

  setCert(campo: 'responsable' | 'cargo', valor: string): void {
    this.certForm.update((f) => ({ ...f, [campo]: valor }));
    if (campo === 'responsable') this.certError.set(null);
  }

  /** Sugiere el responsable ya registrado en el área actual. */
  private prefillCert(): void {
    const g = this.areaActual();
    const usado = g?.requisitos.find((r) => r.responsable)?.responsable ?? '';
    this.certForm.set({ responsable: usado, cargo: '' });
  }

  responder(r: Requisito, respuesta: RespuestaRequisito): void {
    if (!this.pazSalvoEditable || r.respuesta === respuesta) return;
    if (this.requiereObservacion(r, respuesta) && !r.observacion?.trim()) {
      this.abrirObservacion(r, respuesta);
      return;
    }
    this.guardarRespuesta(r, respuesta, r.observacion);
  }

  editarObservacion(r: Requisito): void {
    if (!this.pazSalvoEditable) return;
    this.abrirObservacion(r, r.respuesta);
  }

  private abrirObservacion(r: Requisito, respuesta: RespuestaRequisito | null): void {
    this.reqTarget.set(r);
    this.reqRespuesta.set(respuesta);
    this.obsError.set(null);
    this.reqForm.reset({ observacion: r.observacion ?? '' });
    this.showReqModal.set(true);
    setTimeout(() => document.getElementById('obs-texto')?.focus());
  }

  private guardarRespuesta(
    r: Requisito,
    respuesta: RespuestaRequisito | null,
    observacion: string | null,
    alTerminar?: () => void,
  ): void {
    this.api.patchRequisito(r.id, { respuesta, observacion }).subscribe({
      next: () => {
        alTerminar?.();
        this.refrescar();
      },
      error: (err) => this.toast.error(apiErrorMessage(err)),
    });
  }

  marcarEsperado(g: GrupoDepartamento): void {
    const e = this.expediente();
    if (!e) return;
    const n = g.total - g.respondidos;
    this.api.marcarAreaEsperado(e.id, g.departamento).subscribe({
      next: (exp) => {
        this.expediente.set(exp);
        this.toast.success(`${n} ítem(s) de ${g.departamento} marcados con su respuesta esperada`);
      },
      error: (err) => this.toast.error(apiErrorMessage(err)),
    });
  }

  certificarArea(g: GrupoDepartamento): void {
    const e = this.expediente();
    if (!e) return;
    const { responsable, cargo } = this.certForm();
    if (responsable.trim().length < 3) {
      this.certError.set('Escriba el nombre del responsable del área (mínimo 3 caracteres).');
      document.getElementById('cert-responsable')?.focus();
      return;
    }
    this.api
      .certificarArea(e.id, g.departamento, {
        responsable: responsable.trim(),
        cargo: cargo.trim() || null,
      })
      .subscribe({
        next: (exp) => {
          this.responsablesPrevios.set(guardarEnLista(LS_RESPONSABLES, responsable.trim()));
          if (cargo.trim()) this.cargosPrevios.set(guardarEnLista(LS_CARGOS, cargo.trim()));
          this.expediente.set(exp);
          this.toast.success(`Área ${g.departamento} certificada`);
          const siguiente = this.grupos().findIndex((x) => !x.aprobacion);
          if (siguiente >= 0) this.irArea(siguiente);
        },
        error: (err) => this.certError.set(apiErrorMessage(err)),
      });
  }

  pedirRevertir(g: GrupoDepartamento): void {
    this.confirmacion.set({
      titulo: 'Revertir certificación',
      mensaje: `Se quitará la certificación del área ${g.departamento} para poder modificar sus respuestas. ¿Continuar?`,
      boton: 'Revertir',
      peligro: true,
      accion: () => {
        const e = this.expediente();
        if (!e) return;
        this.api.revertirArea(e.id, g.departamento).subscribe({
          next: (exp) => {
            this.expediente.set(exp);
            this.prefillCert();
            this.toast.success(`Certificación de ${g.departamento} revertida`);
          },
          error: (err) => this.toast.error(apiErrorMessage(err)),
        });
      },
    });
  }

  pedirRegenerar(): void {
    this.confirmacion.set({
      titulo: 'Regenerar requisitos',
      mensaje:
        'Se borrarán los requisitos sin respuesta y se volverán a crear desde la plantilla, los bienes asignados y las deudas pendientes actuales. Las respuestas registradas se conservan.',
      boton: 'Regenerar',
      accion: () => {
        const e = this.expediente();
        if (!e) return;
        this.api.regenerarRequisitos(e.id).subscribe({
          next: (r) => {
            this.expediente.set(r.expediente);
            this.toast.success(
              `Requisitos regenerados: ${r.creados} nuevos, ${r.eliminados} eliminados`,
            );
          },
          error: (err) => this.toast.error(apiErrorMessage(err)),
        });
      },
    });
  }

  get puedeReabrirPazSalvo(): boolean {
    const e = this.expediente();
    return !!e && e.estado === 'Paz y salvo aprobado' && !e.liquidacion?.confirmada;
  }

  pedirReabrir(): void {
    this.confirmacion.set({
      titulo: 'Reabrir paz y salvo',
      mensaje:
        'El expediente volverá a "En proceso" para poder agregar o corregir bienes, deudas y respuestas. Las áreas certificadas se mantienen salvo que cambien. Después deberá aprobar el paz y salvo otra vez.',
      boton: 'Reabrir',
      peligro: true,
      accion: () => {
        const e = this.expediente();
        if (!e) return;
        this.api.reabrirPazSalvo(e.id).subscribe({
          next: (exp) => {
            this.expediente.set(exp);
            this.toast.success('Paz y salvo reabierto');
          },
          error: (err) => this.toast.error(apiErrorMessage(err)),
        });
      },
    });
  }

  aceptarConfirmacion(): void {
    const c = this.confirmacion();
    this.confirmacion.set(null);
    c?.accion();
  }

  docsDeRequisito(requisitoId: number): Documento[] {
    return this.documentos().filter((d) => d.requisitoId === requisitoId);
  }

  /** Tipo de documento sugerido según el requisito. */
  sugerirTipo(r: Requisito | undefined): TipoDocumento {
    if (!r) return 'Otro';
    const p = r.pregunta.toLowerCase();
    if (p.includes('acta')) return 'Acta de entrega-recepción';
    if (p.includes('informe')) return 'Informe de gestión';
    if (p.includes('vacaciones')) return 'Anexo de vacaciones';
    if (r.origen === 'Obligacion') return 'Comprobante de pago';
    if (r.origen === 'Bien') return 'Acta de entrega-recepción';
    return 'Otro';
  }

  onDropGeneral(ev: DragEvent): void {
    ev.preventDefault();
    this.dropGeneral.set(false);
    const file = ev.dataTransfer?.files?.[0];
    if (file && !this.soloLectura) this.openUpload(null, file);
  }

  iconoMime(mime: string): string {
    if (mime === 'application/pdf') return 'bi-file-earmark-pdf';
    if (mime.startsWith('image/')) return 'bi-file-earmark-image';
    return 'bi-file-earmark';
  }

  onDragOver(ev: DragEvent, r: Requisito): void {
    if (this.soloLectura) return;
    ev.preventDefault();
    this.dropRequisitoId.set(r.id);
  }

  onDrop(ev: DragEvent, r: Requisito): void {
    ev.preventDefault();
    this.dropRequisitoId.set(null);
    const file = ev.dataTransfer?.files?.[0];
    if (!file || this.soloLectura) return;
    this.openUpload(r.id, file);
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

  reload(id?: number): void {
    const expedienteId = id ?? this.expediente()?.id;
    if (!expedienteId) return;
    this.loading.set(true);
    this.api.getExpediente(expedienteId).subscribe({
      next: (e) => {
        this.expediente.set(e);
        this.patchLiqForm(e.liquidacion?.entradas);
        this.loading.set(false);
        this.loadDatosTrabajador(e);
        this.loadDocumentos(e.id);
        // Abre el paz y salvo en la primera área sin certificar.
        const pendiente = this.grupos().findIndex((g) => !g.aprobacion);
        this.areaIdx.set(pendiente >= 0 ? pendiente : 0);
        this.prefillCert();
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(apiErrorMessage(err));
      },
    });
  }

  /** Recarga el expediente sin mostrar la pantalla de carga (conserva el paso actual). */
  refrescar(): void {
    const id = this.expediente()?.id;
    if (!id) return;
    this.api.getExpediente(id).subscribe({
      next: (e) => this.expediente.set(e),
      error: (err) => this.toast.error(apiErrorMessage(err)),
    });
  }

  private loadDocumentos(expedienteId: number): void {
    this.api.getDocumentos(expedienteId).subscribe({
      next: (docs) => this.documentos.set(docs),
      error: (err) => this.toast.error(apiErrorMessage(err)),
    });
    this.api.getDocumentosFaltantes(expedienteId).subscribe({
      next: (r) => this.faltantes.set(r.faltantes),
      error: (err) => this.toast.error(apiErrorMessage(err)),
    });
  }

  countDocsRequisito(requisitoId: number): number {
    return this.documentos().filter((d) => d.requisitoId === requisitoId).length;
  }

  documentosPorTipo(): GrupoDocumento[] {
    const map = new Map<TipoDocumento, Documento[]>();
    for (const d of this.documentos()) {
      if (!map.has(d.tipo)) map.set(d.tipo, []);
      map.get(d.tipo)!.push(d);
    }
    return [...map.entries()].map(([tipo, documentos]) => ({ tipo, documentos }));
  }

  formatTamano(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  openUpload(
    requisitoId: number | null = null,
    archivo: File | null = null,
    tipo?: TipoDocumento,
  ): void {
    if (this.soloLectura && !(requisitoId && this.countDocsRequisito(requisitoId))) return;
    const r = this.expediente()?.requisitos?.find((x) => x.id === requisitoId);
    this.uploadRequisitoId.set(requisitoId);
    this.selectedFile.set(archivo);
    this.uploadForm.reset({
      tipo: tipo ?? this.sugerirTipo(r),
      descripcion: r ? r.pregunta : '',
    });
    this.showUploadModal.set(true);
  }

  closeUpload(): void {
    this.showUploadModal.set(false);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile.set(file);
  }

  submitUpload(): void {
    const e = this.expediente();
    const file = this.selectedFile();
    if (!e || !file) {
      this.toast.error('Seleccione un archivo');
      return;
    }
    if (this.uploadForm.invalid) {
      this.uploadForm.markAllAsTouched();
      return;
    }
    this.uploading.set(true);
    this.api
      .uploadDocumento(e.id, {
        archivo: file,
        tipo: this.uploadForm.controls.tipo.value,
        descripcion: this.uploadForm.controls.descripcion.value.trim() || undefined,
        requisitoId: this.uploadRequisitoId(),
      })
      .subscribe({
        next: () => {
          this.uploading.set(false);
          this.showUploadModal.set(false);
          this.toast.success('Documento subido');
          this.loadDocumentos(e.id);
        },
        error: (err) => {
          this.uploading.set(false);
          this.toast.error(apiErrorMessage(err));
        },
      });
  }

  eliminarDocumento(doc: Documento): void {
    if (this.soloLectura) return;
    this.confirmacion.set({
      titulo: 'Eliminar documento',
      mensaje: `¿Eliminar «${doc.nombreOriginal}»? Esta acción no se puede deshacer.`,
      boton: 'Eliminar',
      peligro: true,
      accion: () => this.eliminarDocumentoConfirmado(doc),
    });
  }

  private eliminarDocumentoConfirmado(doc: Documento): void {
    this.api.deleteDocumento(doc.id).subscribe({
      next: () => {
        this.toast.success('Documento eliminado');
        const e = this.expediente();
        if (e) this.loadDocumentos(e.id);
      },
      error: (err) => this.toast.error(apiErrorMessage(err)),
    });
  }

  verDocumento(doc: Documento): void {
    this.closeDocViewer();
    this.docViewerTitle.set(doc.nombreOriginal);
    this.docViewerMime.set(doc.mime);
    this.docViewerUrl.set(
      this.sanitizer.bypassSecurityTrustResourceUrl(this.api.urlDocumentoVer(doc.id)),
    );
    this.showDocViewer.set(true);
  }

  descargarDocumento(doc: Documento): void {
    const a = document.createElement('a');
    a.href = this.api.urlDocumentoDescargar(doc.id);
    a.download = doc.nombreOriginal;
    a.click();
  }

  closeDocViewer(): void {
    this.showDocViewer.set(false);
    this.docViewerUrl.set(null);
    if (this.rawDocUrl) {
      URL.revokeObjectURL(this.rawDocUrl);
      this.rawDocUrl = null;
    }
  }

  isImageMime(mime: string): boolean {
    return mime.startsWith('image/');
  }

  isPdfMime(mime: string): boolean {
    return mime === 'application/pdf';
  }

  /** Saldo de vacaciones a la fecha de salida y obligaciones pendientes. */
  private loadDatosTrabajador(e: Expediente): void {
    this.api.getVacaciones(e.trabajadorId, e.fechaSalida).subscribe({
      next: (v) => {
        this.vacaciones.set(v);
        if (!e.liquidacion) {
          this.liqForm.controls.diasVacacionesPendientesAnteriores.setValue(
            v.saldoPeriodosCompletos,
          );
        }
      },
      error: (err) => this.toast.error(apiErrorMessage(err)),
    });
    this.api.getObligaciones(e.trabajadorId).subscribe({
      next: (list) =>
        this.obligacionesPendientes.set(list.filter((o) => o.estado !== 'Pagada')),
      error: (err) => this.toast.error(apiErrorMessage(err)),
    });
  }

  usarSaldoCalculado(): void {
    const saldo = this.saldoVacaciones;
    if (saldo === null) return;
    this.liqForm.patchValue({
      diasVacacionesPendientesAnteriores: saldo,
      justificacionDiasVacaciones: '',
    });
  }

  setTab(t: 'general' | 'paz' | 'liq' | 'docs' | 'digital'): void {
    this.tab.set(t);
  }

  closeReq(): void {
    this.showReqModal.set(false);
  }

  saveReq(): void {
    const r = this.reqTarget();
    if (!r) return;
    const observacion = this.reqForm.controls.observacion.value?.trim() || null;
    const respuesta = this.reqRespuesta();
    if (this.requiereObservacion(r, respuesta) && !observacion) {
      this.obsError.set(
        respuesta === 'N/A'
          ? 'La observación es obligatoria cuando la respuesta es N/A.'
          : 'La observación es obligatoria cuando el requisito no cumple.',
      );
      document.getElementById('obs-texto')?.focus();
      return;
    }
    this.guardarRespuesta(r, respuesta, observacion, () => this.showReqModal.set(false));
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
    this.cargandoEntradas = true;
    try {
      this.patchLiqFormInterno(entradas);
    } finally {
      this.cargandoEntradas = false;
    }
  }

  private patchLiqFormInterno(entradas?: EntradasLiquidacion | null): void {
    this.otrosHaberes.clear();
    this.anticipos.clear();
    this.otrasDeducciones.clear();
    this.liqForm.patchValue({
      diasVacacionesPendientesAnteriores:
        entradas?.diasVacacionesPendientesAnteriores ?? this.saldoVacaciones ?? 0,
      justificacionDiasVacaciones: entradas?.justificacionDiasVacaciones ?? '',
      observaciones: entradas?.observaciones ?? '',
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
      justificacionDiasVacaciones: v.justificacionDiasVacaciones.trim() || null,
      observaciones: v.observaciones.trim() || null,
      otrosHaberes: v.otrosHaberes,
      anticipos: v.anticipos,
      otrasDeducciones: v.otrasDeducciones,
    };
  }

  /**
   * Calcula la liquidación. En modo silencioso (recálculo automático) solo
   * actualiza el resultado, sin avisos ni recargar el formulario.
   */
  calcular(silencioso = false): void {
    const e = this.expediente();
    if (!e || this.soloLectura || e.liquidacion?.confirmada) return;
    if (
      this.diasVacacionesEditados &&
      !this.liqForm.controls.justificacionDiasVacaciones.value.trim()
    ) {
      if (!silencioso) this.toast.error('Justifique el cambio de días de vacaciones pendientes');
      return;
    }
    if (this.liqForm.invalid) {
      if (!silencioso) {
        this.liqForm.markAllAsTouched();
        this.toast.error('Complete concepto, valor y justificación de cada ítem agregado');
      }
      return;
    }
    this.calculando.set(true);
    this.api.calcularLiquidacion(e.id, this.entradasFromForm()).subscribe({
      next: (liq) => {
        this.calculando.set(false);
        this.expediente.update((x) => (x ? { ...x, liquidacion: liq } : x));
        if (!silencioso) this.toast.success('Liquidación calculada');
      },
      error: (err) => {
        this.calculando.set(false);
        this.toast.error(apiErrorMessage(err));
      },
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

  private pdfRequest(tipo: 'paz' | 'liq' | 'anexo') {
    const e = this.expediente()!;
    if (tipo === 'paz') return this.api.getPdfPazSalvo(e.id);
    if (tipo === 'liq') return this.api.getPdfLiquidacion(e.id);
    return this.api.getPdfAnexoVacaciones(e.id);
  }

  private pdfTitleOf(tipo: 'paz' | 'liq' | 'anexo'): string {
    if (tipo === 'paz') return 'Paz y salvo';
    if (tipo === 'liq') return 'Liquidación';
    return 'Anexo de vacaciones';
  }

  private pdfFilename(tipo: 'paz' | 'liq' | 'anexo'): string {
    const e = this.expediente()!;
    if (tipo === 'paz') return `paz-salvo-${e.numero}.pdf`;
    if (tipo === 'liq') return `liquidacion-${e.numero}.pdf`;
    return `anexo-vacaciones-${e.numero}.pdf`;
  }

  private async pdfErrorMessage(err: unknown): Promise<string> {
    let msg = apiErrorMessage(err);
    const anyErr = err as { error?: Blob };
    if (anyErr?.error instanceof Blob) {
      try {
        const text = await anyErr.error.text();
        const parsed = JSON.parse(text);
        if (parsed?.message) msg = parsed.message;
      } catch {
        /* ignore */
      }
    }
    return msg;
  }

  verPdf(tipo: 'paz' | 'liq' | 'anexo'): void {
    const e = this.expediente();
    if (!e) return;
    this.pdfRequest(tipo).subscribe({
      next: (blob) => {
        if (this.rawPdfUrl) URL.revokeObjectURL(this.rawPdfUrl);
        this.rawPdfUrl = URL.createObjectURL(blob);
        this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.rawPdfUrl));
        this.pdfTitle.set(this.pdfTitleOf(tipo));
        this.showPdf.set(true);
      },
      error: async (err) => this.toast.error(await this.pdfErrorMessage(err)),
    });
  }

  descargarPdf(tipo: 'paz' | 'liq' | 'anexo'): void {
    const e = this.expediente();
    if (!e) return;
    this.pdfRequest(tipo).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.pdfFilename(tipo);
        a.click();
        URL.revokeObjectURL(url);
        this.toast.success('Descarga iniciada');
      },
      error: async (err) => this.toast.error(await this.pdfErrorMessage(err)),
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
