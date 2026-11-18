import { Router } from 'express';
import { AppDataSource } from '../data-source';
import { Expediente } from '../entities/Expediente';
import { Liquidacion } from '../entities/Liquidacion';
import { badRequest, notFound } from '../errors';
import { asyncHandler } from '../middleware';
import {
  findDocumentoSistema,
  generarAnexoVacacionesBuffer,
  generarLiquidacionBuffer,
  generarPazSalvoBuffer,
  readDocumentoFile,
  type PdfSistemaKind,
} from '../pdf-sistema';

const router = Router({ mergeParams: true });

async function getExpediente(id: number): Promise<Expediente> {
  const expediente = await AppDataSource.getRepository(Expediente).findOne({
    where: { id },
    relations: ['trabajador'],
  });
  if (!expediente) throw notFound('Expediente no encontrado');
  return expediente;
}

async function sendPdf(
  res: import('express').Response,
  buffer: Buffer,
  filename: string,
): Promise<void> {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.send(buffer);
}

async function bufferDesdeCopiaOGenerar(
  expediente: Expediente,
  kind: PdfSistemaKind,
  generar: () => Promise<Buffer>,
): Promise<Buffer> {
  if (expediente.estado === 'Finalizado') {
    const doc = await findDocumentoSistema(
      expediente.id,
      kind,
      expediente.numero,
    );
    if (doc) return readDocumentoFile(doc);
  }
  return generar();
}

router.get(
  '/paz-salvo',
  asyncHandler(async (req, res) => {
    const expediente = await getExpediente(Number(req.params.id));
    if (expediente.estado === 'En proceso') {
      throw badRequest('El paz y salvo aún no está aprobado');
    }

    const pdf = await bufferDesdeCopiaOGenerar(expediente, 'paz-salvo', () =>
      generarPazSalvoBuffer(expediente),
    );
    await sendPdf(res, pdf, `paz-salvo-${expediente.numero}.pdf`);
  }),
);

router.get(
  '/liquidacion',
  asyncHandler(async (req, res) => {
    const expediente = await getExpediente(Number(req.params.id));
    const liquidacion = await AppDataSource.getRepository(Liquidacion).findOne({
      where: { expedienteId: expediente.id },
    });
    if (!liquidacion) throw notFound('Liquidación no encontrada');

    const pdf = await bufferDesdeCopiaOGenerar(expediente, 'liquidacion', () =>
      generarLiquidacionBuffer(expediente, liquidacion),
    );
    await sendPdf(res, pdf, `liquidacion-${expediente.numero}.pdf`);
  }),
);

router.get(
  '/anexo-vacaciones',
  asyncHandler(async (req, res) => {
    const expediente = await getExpediente(Number(req.params.id));
    const pdf = await bufferDesdeCopiaOGenerar(
      expediente,
      'anexo-vacaciones',
      async () => {
        const { buffer } = await generarAnexoVacacionesBuffer(expediente);
        return buffer;
      },
    );
    await sendPdf(res, pdf, `anexo-vacaciones-${expediente.numero}.pdf`);
  }),
);

export default router;
