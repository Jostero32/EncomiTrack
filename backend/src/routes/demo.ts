import { Router } from 'express';
import { AppDataSource } from '../data-source';
import { Empresa } from '../entities/Empresa';
import { Trabajador } from '../entities/Trabajador';
import { asyncHandler } from '../middleware';

const router = Router();

router.post(
  '/cargar',
  asyncHandler(async (_req, res) => {
    const eRepo = AppDataSource.getRepository(Empresa);
    const tRepo = AppDataSource.getRepository(Trabajador);

    let empresa = await eRepo.findOne({ where: {}, order: { id: 'ASC' } });
    if (!empresa) {
      empresa = await eRepo.save(
        eRepo.create({
          razonSocial: 'Comercializadora Andina S.A.',
          ruc: '1891234567001',
          direccion: 'Av. Cevallos, Ambato',
          representante: 'María Fernanda López',
        }),
      );
    }

    let trabajador = await tRepo.findOne({
      where: { cedula: '1800000001' },
    });
    if (!trabajador) {
      trabajador = await tRepo.save(
        tRepo.create({
          cedula: '1800000001',
          nombres: 'Carlos Andrés',
          apellidos: 'Mendoza',
          cargo: 'Asistente administrativo',
          departamento: 'Administrativo',
          fechaIngreso: '2022-03-01',
          remuneracion: '800.00',
          estado: 'Activo',
        }),
      );
    }

    res.json({ empresa, trabajador });
  }),
);

export default router;
