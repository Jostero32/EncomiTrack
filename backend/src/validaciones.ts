import { z } from 'zod';
import { SBU } from './calculos';

/** Remuneración mensual: número positivo y no menor al SBU vigente. */
export const remuneracionSchema = z
  .union([z.string(), z.number()])
  .transform((v) => Number(v))
  .refine((v) => Number.isFinite(v), 'Remuneración inválida')
  .refine((v) => v >= SBU, `La remuneración no puede ser menor al SBU ($${SBU})`);
