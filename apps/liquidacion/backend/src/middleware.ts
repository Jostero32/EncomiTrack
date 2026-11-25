import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { AppError } from './errors';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.status).json({ message: err.message });
    return;
  }
  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'El archivo supera el máximo de 10 MB'
        : err.message;
    res.status(400).json({ message });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      message: err.errors.map((e) => e.message).join('; ') || 'Datos inválidos',
    });
    return;
  }
  console.error(err);
  const message =
    err instanceof Error ? err.message : 'Error interno del servidor';
  res.status(500).json({ message });
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
