import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { apiErrorMessage } from '../../core/error.util';
import { DashboardData, EstadoExpediente } from '../../core/models';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './dashboard.html',
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly data = signal<DashboardData | null>(null);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.api.getDashboard().subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(apiErrorMessage(err));
      },
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
