import { Component, OnInit, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { apiErrorMessage } from '../../core/error.util';
import { PlantillaDto, RespuestaEsperada } from '../../core/models';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [ReactiveFormsModule],
  styles: [
    `
      .plantilla-orden {
        width: 5rem;
      }
      .plantilla-esperada {
        width: 6.5rem;
      }
    `,
  ],
  templateUrl: './configuracion.html',
})
export class ConfiguracionComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly saving = signal(false);

  /** Filas editables de la plantilla del paz y salvo (id null = nueva). */
  readonly plantilla = signal<Array<PlantillaDto & { id: number | null }>>([]);
  readonly sugerenciasDepto = [
    'Jefe inmediato',
    'Talento Humano',
    'Sistemas',
    'Contabilidad',
    'Bodega',
    'Administrativo',
  ];

  readonly form = this.fb.nonNullable.group({
    razonSocial: ['', Validators.required],
    ruc: ['', Validators.required],
    direccion: ['', Validators.required],
    representante: ['', Validators.required],
    ciudad: [''],
    elaboradoNombre: [''],
    elaboradoCargo: [''],
    revisadoNombre: [''],
    revisadoCargo: [''],
    aprobadoNombre: [''],
    aprobadoCargo: [''],
  });

  ngOnInit(): void {
    this.loadPlantilla();
    this.api.getEmpresa().subscribe({
      next: (e) => {
        this.form.setValue({
          razonSocial: e.razonSocial,
          ruc: e.ruc,
          direccion: e.direccion,
          representante: e.representante,
          ciudad: e.ciudad ?? '',
          elaboradoNombre: e.elaboradoNombre ?? '',
          elaboradoCargo: e.elaboradoCargo ?? '',
          revisadoNombre: e.revisadoNombre ?? '',
          revisadoCargo: e.revisadoCargo ?? '',
          aprobadoNombre: e.aprobadoNombre ?? '',
          aprobadoCargo: e.aprobadoCargo ?? '',
        });
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.api.updateEmpresa(this.form.getRawValue()).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Empresa actualizada');
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(apiErrorMessage(err));
      },
    });
  }

  loadPlantilla(): void {
    this.api.getPlantilla().subscribe({
      next: (list) => this.plantilla.set(list.map((p) => ({ ...p }))),
      error: (err) => this.toast.error(apiErrorMessage(err)),
    });
  }

  updateFila(
    index: number,
    campo: 'departamento' | 'pregunta' | 'respuestaEsperada' | 'orden',
    value: string,
  ): void {
    this.plantilla.update((rows) =>
      rows.map((r, i) =>
        i !== index
          ? r
          : {
              ...r,
              [campo]:
                campo === 'orden'
                  ? Number(value) || 0
                  : campo === 'respuestaEsperada'
                    ? (value as RespuestaEsperada)
                    : value,
            },
      ),
    );
  }

  agregarFila(): void {
    const maxOrden = Math.max(0, ...this.plantilla().map((r) => r.orden));
    this.plantilla.update((rows) => [
      ...rows,
      { id: null, departamento: '', pregunta: '', respuestaEsperada: 'SI', orden: maxOrden + 1 },
    ]);
  }

  guardarFila(index: number): void {
    const { id, ...data } = this.plantilla()[index];
    if (!data.departamento.trim() || !data.pregunta.trim()) {
      this.toast.error('Departamento y pregunta son obligatorios');
      return;
    }
    this.api.savePlantilla(data, id ?? undefined).subscribe({
      next: () => {
        this.toast.success('Pregunta guardada');
        this.loadPlantilla();
      },
      error: (err) => this.toast.error(apiErrorMessage(err)),
    });
  }

  eliminarFila(index: number): void {
    const fila = this.plantilla()[index];
    if (fila.id === null) {
      this.plantilla.update((rows) => rows.filter((_, i) => i !== index));
      return;
    }
    if (!confirm('¿Eliminar la pregunta de la plantilla?')) return;
    this.api.deletePlantilla(fila.id).subscribe({
      next: () => {
        this.toast.success('Pregunta eliminada');
        this.loadPlantilla();
      },
      error: (err) => this.toast.error(apiErrorMessage(err)),
    });
  }

  cargarDemo(): void {
    this.api.cargarDemo().subscribe({
      next: () => this.toast.success('Caso demo cargado'),
      error: (err) => this.toast.error(apiErrorMessage(err)),
    });
  }
}
