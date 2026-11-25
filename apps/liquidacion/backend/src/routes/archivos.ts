import { Router } from 'express';
import fs from 'fs';
import { AppDataSource } from '../data-source';
import { Documento } from '../entities/Documento';
import { Expediente } from '../entities/Expediente';
import { forbidden, notFound } from '../errors';
import { asyncHandler } from '../middleware';

const router = Router();

const docRepo = () => AppDataSource.getRepository(Documento);
const expRepo = () => AppDataSource.getRepository(Expediente);

async function getDocumento(id: number): Promise<Documento> {
  const doc = await docRepo().findOne({ where: { id } });
  if (!doc) throw notFound('Documento no encontrado');
  return doc;
}

router.get(
  '/:id/ver',
  asyncHandler(async (req, res) => {
    const doc = await getDocumento(Number(req.params.id));
    if (!fs.existsSync(doc.ruta)) throw notFound('Archivo no encontrado en disco');
    res.setHeader('Content-Type', doc.mime);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(doc.nombreOriginal)}"`,
    );
    fs.createReadStream(doc.ruta).pipe(res);
  }),
);

router.get(
  '/:id/descargar',
  asyncHandler(async (req, res) => {
    const doc = await getDocumento(Number(req.params.id));
    if (!fs.existsSync(doc.ruta)) throw notFound('Archivo no encontrado en disco');
    res.setHeader('Content-Type', doc.mime);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(doc.nombreOriginal)}"`,
    );
    fs.createReadStream(doc.ruta).pipe(res);
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const doc = await getDocumento(Number(req.params.id));
    const expediente = await expRepo().findOne({
      where: { id: doc.expedienteId },
    });
    if (!expediente) throw notFound('Expediente no encontrado');
    if (expediente.estado === 'Finalizado') {
      throw forbidden('Expediente finalizado: solo lectura');
    }

    if (fs.existsSync(doc.ruta)) {
      fs.unlinkSync(doc.ruta);
    }
    await docRepo().remove(doc);
    res.status(204).send();
  }),
);

export default router;
