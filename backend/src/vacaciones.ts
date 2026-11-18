import { calcularPeriodosVacaciones, ResultadoVacaciones } from './calculos';
import { AppDataSource } from './data-source';
import { VacacionGozada } from './entities/VacacionGozada';

export async function obtenerVacaciones(
  trabajadorId: number,
  fechaIngreso: string,
  fechaCorte: string,
): Promise<ResultadoVacaciones & { gozadas: VacacionGozada[] }> {
  const gozadas = await AppDataSource.getRepository(VacacionGozada).find({
    where: { trabajadorId },
    order: { fechaInicio: 'ASC', id: 'ASC' },
  });
  return {
    ...calcularPeriodosVacaciones(fechaIngreso, fechaCorte, gozadas),
    gozadas,
  };
}
