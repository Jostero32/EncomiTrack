export class AppError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'AppError';
  }
}

export function notFound(message = 'No encontrado'): AppError {
  return new AppError(404, message);
}

export function badRequest(message: string): AppError {
  return new AppError(400, message);
}

export function conflict(message: string): AppError {
  return new AppError(409, message);
}

export function forbidden(message: string): AppError {
  return new AppError(403, message);
}
