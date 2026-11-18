import { Component, inject } from '@angular/core';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-toasts',
  standalone: true,
  template: `
    <div
      class="toast-container position-fixed top-0 end-0 p-3"
      style="z-index: 2000"
      aria-live="polite"
      aria-atomic="false"
    >
      @for (t of toastService.toasts(); track t.id) {
        <div
          class="toast show align-items-center text-bg-{{ t.type }} border-0 mb-2"
          [attr.role]="t.type === 'danger' ? 'alert' : 'status'"
        >
          <div class="d-flex">
            <div class="toast-body">{{ t.message }}</div>
            <button
              type="button"
              class="btn-close btn-close-white me-2 m-auto"
              aria-label="Cerrar aviso"
              (click)="toastService.dismiss(t.id)"
            ></button>
          </div>
        </div>
      }
    </div>
  `,
})
export class ToastsComponent {
  readonly toastService = inject(ToastService);
}
