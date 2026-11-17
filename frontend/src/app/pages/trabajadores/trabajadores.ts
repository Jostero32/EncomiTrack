import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { apiErrorMessage } from '../../core/error.util';
import { Expediente, Trabajador } from '../../core/models';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-trabajadores',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe, RouterLink],
  templateUrl: './trabajadores.html',
})
export class TrabajadoresComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly trabajadores = signal<Trabajador[]>([]);
  readonly historial = signal<Expediente[]>([]);
  readonly q = signal('');
  readonly showForm = signal(false);
  readonly showHistorial = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly historialNombre = signal('');

  readonly form = this.fb.nonNullable.group({
    cedula: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    nombres: ['', Validators.required],
    apellidos: ['', Validators.required],
    cargo: ['', Validators.required],
    departamento: ['', Validators.required],
    fechaIngreso: ['', Validators.required],
    remuneracion: [0, [Validators.required, Validators.min(0.01)]],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.getTrabajadores(this.q() || undefined).subscribe({
      next: (list) => this.trabajadores.set(list),
      error: (err) => this.toast.error(apiErrorMessage(err)),
    });
  }

  search(): void {
    this.load();
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({
      cedula: '',
      nombres: '',
      apellidos: '',
      cargo: '',
      departamento: '',
      fechaIngreso: '',
      remuneracion: 0,
    });
    this.showForm.set(true);
  }

  openEdit(t: Trabajador): void {
    this.editingId.set(t.id);
    this.form.setValue({
      cedula: t.cedula,
      nombres: t.nombres,
      apellidos: t.apellidos,
      cargo: t.cargo,
      departamento: t.departamento,
      fechaIngreso: t.fechaIngreso,
      remuneracion: Number(t.remuneracion),
    });
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const id = this.editingId();
    const req = id
      ? this.api.updateTrabajador(id, value)
      : this.api.createTrabajador(value);

    req.subscribe({
      next: () => {
        this.toast.success(id ? 'Trabajador actualizado' : 'Trabajador creado');
        this.showForm.set(false);
        this.load();
      },
      error: (err) => this.toast.error(apiErrorMessage(err)),
    });
  }

  openHistorial(t: Trabajador): void {
    this.historialNombre.set(`${t.nombres} ${t.apellidos}`);
    this.api.getExpedientesTrabajador(t.id).subscribe({
      next: (list) => {
        this.historial.set(list);
        this.showHistorial.set(true);
      },
      error: (err) => this.toast.error(apiErrorMessage(err)),
    });
  }

  closeHistorial(): void {
    this.showHistorial.set(false);
  }
}
