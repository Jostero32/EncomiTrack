import { Router } from 'express';
import { AppDataSource } from '../data-source';
import { Empresa } from '../entities/Empresa';
import { Expediente } from '../entities/Expediente';
import { Liquidacion } from '../entities/Liquidacion';
import { Requisito } from '../entities/Requisito';
import { badRequest, notFound } from '../errors';
import { asyncHandler } from '../middleware';
import { buildLiquidacionPdf, buildPazSalvoPdf } from '../pdfs';

const router = Router({ mergeParams: true });

async function getEmpresa(): Promise<Empresa> {
  const empresa = await AppDataSource.getRepository(Empresa).findOne({
    where: {},
    order: { id: 'ASC' },
  });
  if (!empresa) throw notFound('Empresa no configurada');
  return empresa;
}

router.get(
  '/paz-salvo',
  asyncHandler(async (req, res) => {
    const expediente = await AppDataSource.getRepository(Expediente).findOne({
      where: { id: Number(req.params.id) },
      relations: ['trabajador'],
    });
    if (!expediente) throw notFound('Expediente no encontrado');
    if (expediente.estado === 'En proceso') {
      throw badRequest('El paz y salvo aún no está aprobado');
    }

    const requisitos = await AppDataSource.getRepository(Requisito).find({
      where: { expedienteId: expediente.id },
      order: { id: 'ASC' },
    });
    const empresa = await getEmpresa();
    const pdf = await buildPazSalvoPdf(empresa, expediente, requisitos);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="paz-salvo-${expediente.numero}.pdf"`,
    );
    res.send(pdf);
  }),
);

router.get(
  '/liquidacion',
  asyncHandler(async (req, res) => {
    const expediente = await AppDataSource.getRepository(Expediente).findOne({
      where: { id: Number(req.params.id) },
      relations: ['trabajador'],
    });
    if (!expediente) throw notFound('Expediente no encontrado');

    const liquidacion = await AppDataSource.getRepository(Liquidacion).findOne({
      where: { expedienteId: expediente.id },
    });
    if (!liquidacion) throw notFound('Liquidación no encontrada');

    const empresa = await getEmpresa();
    const pdf = await buildLiquidacionPdf(empresa, expediente, liquidacion);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="liquidacion-${expediente.numero}.pdf"`,
    );
    res.send(pdf);
  }),
);

export default router;
