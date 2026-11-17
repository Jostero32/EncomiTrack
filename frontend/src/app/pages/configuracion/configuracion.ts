import { Component, OnInit, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { apiErrorMessage } from '../../core/error.util';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './configuracion.html',
})
export class ConfiguracionComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    razonSocial: ['', Validators.required],
    ruc: ['', Validators.required],
    direccion: ['', Validators.required],
    representante: ['', Validators.required],
  });

  ngOnInit(): void {
    this.api.getEmpresa().subscribe({
      next: (e) => {
        this.form.setValue({
          razonSocial: e.razonSocial,
          ruc: e.ruc,
          direccion: e.direccion,
          representante: e.representante,
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

  cargarDemo(): void {
    this.api.cargarDemo().subscribe({
      next: () => this.toast.success('Caso demo cargado'),
      error: (err) => this.toast.error(apiErrorMessage(err)),
    });
  }
}
