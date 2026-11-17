import { HttpErrorResponse } from '@angular/common/http';

export function apiErrorMessage(err: unknown, fallback = 'Error inesperado'): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error;
    if (body && typeof body === 'object' && 'message' in body) {
      return String((body as { message: string }).message);
    }
    if (typeof body === 'string' && body.trim()) return body;
    return err.message || fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
