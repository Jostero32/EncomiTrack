import { AppDataSource } from './data-source';
import { PlantillaRequisito } from './entities/PlantillaRequisito';

/** Plantilla inicial del paz y salvo; se siembra si la tabla está vacía. */
export const PLANTILLA_DEFAULT: Array<
  Pick<PlantillaRequisito, 'departamento' | 'pregunta' | 'respuestaEsperada' | 'orden'>
> = [
  {
    departamento: 'Jefe inmediato',
    pregunta: '¿Entregó el informe de labores?',
    respuestaEsperada: 'SI',
    orden: 1,
  },
  {
    departamento: 'Jefe inmediato',
    pregunta: '¿Firmó el acta de entrega-recepción de documentos?',
    respuestaEsperada: 'SI',
    orden: 2,
  },
  {
    departamento: 'Jefe inmediato',
    pregunta: '¿Realizó la transferencia de información?',
    respuestaEsperada: 'SI',
    orden: 3,
  },
  {
    departamento: 'Sistemas',
    pregunta: '¿Se respaldó la información del equipo?',
    respuestaEsperada: 'SI',
    orden: 4,
  },
  {
    departamento: 'Contabilidad',
    pregunta: '¿Tiene fondos de caja chica sin liquidar?',
    respuestaEsperada: 'NO',
    orden: 5,
  },
  {
    departamento: 'Talento Humano',
    pregunta: '¿Se verificó el anexo de vacaciones?',
    respuestaEsperada: 'SI',
    orden: 6,
  },
];

export async function seedPlantilla(): Promise<void> {
  const repo = AppDataSource.getRepository(PlantillaRequisito);
  if ((await repo.count()) > 0) return;
  await repo.save(PLANTILLA_DEFAULT.map((p) => repo.create(p)));
}
