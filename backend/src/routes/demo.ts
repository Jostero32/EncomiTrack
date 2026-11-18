import { Router } from 'express';
import { Not } from 'typeorm';
import { AppDataSource } from '../data-source';
import { BienAsignado } from '../entities/BienAsignado';
import { Empresa } from '../entities/Empresa';
import { Expediente } from '../entities/Expediente';
import { Obligacion } from '../entities/Obligacion';
import { Trabajador } from '../entities/Trabajador';
import { VacacionGozada } from '../entities/VacacionGozada';
import { asyncHandler } from '../middleware';
import { crearRequisitos } from '../paz-salvo-db';

const router = Router();

/**
 * Caso demo: Andrea Paredes, Analista de Sistemas, $900, ingreso 01/03/2023,
 * salida 15/11/2026 por renuncia (Sierra, décimos acumulados, fondo de reserva
 * mensualizado). Valores esperados en tests/calculos.test.ts.
 */
const DEMO_EMPRESA = {
  razonSocial: 'Distribuidora Andina del Centro S.A.',
  ruc: '1891234567001',
  direccion: 'Av. Cevallos y Montalvo, Ambato',
  representante: 'Ing. María Fernanda López',
  ciudad: 'Ambato',
  elaboradoNombre: 'Lic. Daniela Torres',
  elaboradoCargo: 'Analista de Talento Humano',
  revisadoNombre: 'CPA Marco Villacrés',
  revisadoCargo: 'Contador General',
  aprobadoNombre: 'Ing. María Fernanda López',
  aprobadoCargo: 'Gerente General',
};

const DEMO_TRABAJADOR = {
  cedula: '1804567897',
  nombres: 'Andrea Lucía',
  apellidos: 'Paredes Villacís',
  cargo: 'Analista de Sistemas',
  departamento: 'Sistemas',
  tipoVinculo: 'Código de Trabajo' as const,
  unidad: 'Tecnología',
  jefeInmediato: 'Ing. Paúl Sánchez',
  fechaIngreso: '2023-03-01',
  remuneracion: '900.00',
};

const DEMO_BIENES: Array<
  Pick<
    BienAsignado,
    'tipo' | 'descripcion' | 'codigoSerie' | 'departamentoResponsable' | 'fechaAsignacion'
  >
> = [
  {
    tipo: 'Equipo',
    descripcion: 'Laptop Dell Latitude 5440',
    codigoSerie: 'DL5440-0271',
    departamentoResponsable: 'Sistemas',
    fechaAsignacion: '2023-03-01',
  },
  {
    tipo: 'Credencial',
    descripcion: 'Credencial institucional N.º 0612',
    codigoSerie: null,
    departamentoResponsable: 'Talento Humano',
    fechaAsignacion: '2023-03-01',
  },
  {
    tipo: 'Otro',
    descripcion: 'Escritorio modular con cajonera',
    codigoSerie: 'ESC-0148',
    departamentoResponsable: 'Bodega',
    fechaAsignacion: '2023-03-06',
  },
];

const DEMO_VACACIONES: Array<Pick<VacacionGozada, 'fechaInicio' | 'dias' | 'documento'>> = [
  { fechaInicio: '2024-08-05', dias: 15, documento: 'VAC-2024-031' },
  { fechaInicio: '2025-08-04', dias: 10, documento: 'VAC-2025-022' },
];

const DEMO_SALIDA = {
  fechaSalida: '2026-11-15',
  causa: 'Renuncia voluntaria' as const,
  region: 'Sierra-Amazonía' as const,
  decimosMensualizados: false,
  fondosReservaMensualizados: true,
};

router.post(
  '/cargar',
  asyncHandler(async (_req, res) => {
    const resultado = await AppDataSource.transaction(async (m) => {
      let empresa = await m.findOne(Empresa, { where: {}, order: { id: 'ASC' } });
      empresa = await m.save(
        empresa ? Object.assign(empresa, DEMO_EMPRESA) : m.create(Empresa, DEMO_EMPRESA),
      );

      let trabajador = await m.findOne(Trabajador, {
        where: { cedula: DEMO_TRABAJADOR.cedula },
      });
      if (!trabajador) {
        trabajador = await m.save(
          m.create(Trabajador, { ...DEMO_TRABAJADOR, estado: 'Activo' }),
        );
      }
      const trabajadorId = trabajador.id;

      // Cada colección se siembra solo si el trabajador no tiene registros.
      if ((await m.count(BienAsignado, { where: { trabajadorId } })) === 0) {
        await m.save(
          DEMO_BIENES.map((b) =>
            m.create(BienAsignado, {
              ...b,
              trabajadorId,
              estado: 'Asignado',
              fechaDevolucion: null,
              observacion: null,
            }),
          ),
        );
      }

      if ((await m.count(Obligacion, { where: { trabajadorId } })) === 0) {
        await m.save(
          m.create(Obligacion, {
            trabajadorId,
            tipo: 'Anticipo',
            concepto: 'Anticipo de sueldo noviembre 2026',
            valor: '200.00',
            fecha: '2026-11-03',
            estado: 'Pendiente',
            justificacion: 'Anticipo de sueldo',
          }),
        );
      }

      if ((await m.count(VacacionGozada, { where: { trabajadorId } })) === 0) {
        await m.save(
          DEMO_VACACIONES.map((v) =>
            m.create(VacacionGozada, { ...v, trabajadorId, observacion: null }),
          ),
        );
      }

      let expediente = await m.findOne(Expediente, {
        where: { trabajadorId, estado: Not('Finalizado' as const) },
      });
      if (!expediente) {
        const ultimo = await m.find(Expediente, { order: { id: 'DESC' }, take: 1 });
        expediente = await m.save(
          m.create(Expediente, {
            ...DEMO_SALIDA,
            numero: `EXP-${String((ultimo[0]?.id ?? 0) + 1).padStart(4, '0')}`,
            trabajadorId,
            fechaIngreso: trabajador.fechaIngreso,
            cargo: trabajador.cargo,
            remuneracion: trabajador.remuneracion,
            observaciones: null,
            responsable: null,
            estado: 'En proceso',
          }),
        );
        await crearRequisitos(m, expediente.id, trabajadorId);
      }

      return { empresa, trabajador, expediente };
    });

    res.json(resultado);
  }),
);

export default router;
