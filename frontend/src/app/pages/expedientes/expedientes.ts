import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { apiErrorMessage } from '../../core/error.util';
import {
  Causa,
  EstadoExpediente,
  Expediente,
  Region,
  Trabajador,
} from '../../core/models';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-expedientes',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, DatePipe, RouterLink],
  templateUrl: './expedientes.html',
})
export class ExpedientesComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly expedientes = signal<Expediente[]>([]);
  readonly activos = signal<Trabajador[]>([]);
  readonly q = signal('');
  readonly estado = signal('');
  readonly showForm = signal(false);

  readonly causas: Causa[] = [
    'Renuncia voluntaria',
    'Desahucio',
    'Despido intempestivo',
    'Mutuo acuerdo',
    'Fin de contrato',
  ];
  readonly regiones: Region[] = ['Sierra-Amazonía', 'Costa-Galápagos'];
  readonly estados: EstadoExpediente[] = [
    'En proceso',
    'Paz y salvo aprobado',
    'Finalizado',
  ];

  readonly form = this.fb.nonNullable.group({
    trabajadorId: [0, [Validators.required, Validators.min(1)]],
    fechaIngreso: [{ value: '', disabled: true }],
    fechaSalida: ['', Validators.required],
    causa: ['Renuncia voluntaria' as Causa, Validators.required],
    region: ['Sierra-Amazonía' as Region, Validators.required],
    decimosMensualizados: [false],
    responsable: [''],
    observaciones: [''],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.getExpedientes(this.q() || undefined, this.estado() || undefined).subscribe({
      next: (list) => this.expedientes.set(list),
      error: (err) => this.toast.error(apiErrorMessage(err)),
    });
  }

  openCreate(): void {
    this.api.getTrabajadores().subscribe({
      next: (list) => {
        this.activos.set(list.filter((t) => t.estado === 'Activo'));
        this.form.reset({
          trabajadorId: 0,
          fechaIngreso: '',
          fechaSalida: '',
          causa: 'Renuncia voluntaria',
          region: 'Sierra-Amazonía',
          decimosMensualizados: false,
          responsable: '',
          observaciones: '',
        });
        this.showForm.set(true);
      },
      error: (err) => this.toast.error(apiErrorMessage(err)),
    });
  }

  onTrabajadorChange(): void {
    const id = Number(this.form.controls.trabajadorId.value);
    const t = this.activos().find((x) => x.id === id);
    this.form.controls.fechaIngreso.setValue(t?.fechaIngreso ?? '');
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.api
      .createExpediente({
        trabajadorId: Number(raw.trabajadorId),
        fechaSalida: raw.fechaSalida,
        causa: raw.causa,
        region: raw.region,
        decimosMensualizados: raw.decimosMensualizados,
        responsable: raw.responsable || null,
        observaciones: raw.observaciones || null,
      })
      .subscribe({
        next: () => {
          this.toast.success('Expediente creado');
          this.showForm.set(false);
          this.load();
        },
        error: (err) => this.toast.error(apiErrorMessage(err)),
      });
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
}
