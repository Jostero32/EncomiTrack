import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { AppDataSource } from '../data-source';
import {
  Documento,
  TIPOS_DOCUMENTO,
  tiposDocumentoSugeridos,
} from '../entities/Documento';
import { Expediente } from '../entities/Expediente';
import { Requisito } from '../entities/Requisito';
import { badRequest, forbidden, notFound } from '../errors';
import { asyncHandler } from '../middleware';
import { uploadDocumento } from '../upload';

const router = Router({ mergeParams: true });

const docRepo = () => AppDataSource.getRepository(Documento);
const expRepo = () => AppDataSource.getRepository(Expediente);
const reqRepo = () => AppDataSource.getRepository(Requisito);

const tipoSchema = z.enum(TIPOS_DOCUMENTO);

async function getExpediente(id: number): Promise<Expediente> {
  const expediente = await expRepo().findOne({ where: { id } });
  if (!expediente) throw notFound('Expediente no encontrado');
  return expediente;
}

function assertNotFinalizado(expediente: Expediente): void {
  if (expediente.estado === 'Finalizado') {
    throw forbidden('Expediente finalizado: solo lectura');
  }
}

router.get(
  '/faltantes',
  asyncHandler(async (req, res) => {
    const expediente = await getExpediente(Number(req.params.id));
    const docs = await docRepo().find({
      where: { expedienteId: expediente.id },
    });
    const sugeridos = tiposDocumentoSugeridos(expediente.causa);
    const presentes = new Set(docs.map((d) => d.tipo));
    const faltantes = sugeridos.filter((t) => !presentes.has(t));
    res.json({
      sugeridos,
      faltantes,
      causa: expediente.causa,
    });
  }),
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const expediente = await getExpediente(Number(req.params.id));
    const docs = await docRepo().find({
      where: { expedienteId: expediente.id },
      relations: ['requisito'],
      order: { fechaSubida: 'DESC', id: 'DESC' },
    });
    res.json(docs);
  }),
);

router.post(
  '/',
  (req, res, next) => {
    uploadDocumento.single('archivo')(req, res, (err) => {
      if (err) return next(err);
      next();
    });
  },
  asyncHandler(async (req, res) => {
    const expediente = await getExpediente(Number(req.params.id));
    assertNotFinalizado(expediente);

    if (!req.file) {
      throw badRequest('Archivo obligatorio (PDF, JPG o PNG, máx. 10 MB)');
    }

    const tipoParsed = tipoSchema.safeParse(req.body.tipo);
    if (!tipoParsed.success) {
      fs.unlink(req.file.path, () => undefined);
      throw badRequest('Tipo de documento inválido');
    }

    let requisitoId: number | null = null;
    if (req.body.requisitoId !== undefined && req.body.requisitoId !== '') {
      requisitoId = Number(req.body.requisitoId);
      if (!Number.isInteger(requisitoId) || requisitoId <= 0) {
        fs.unlink(req.file.path, () => undefined);
        throw badRequest('requisitoId inválido');
      }
      const requisito = await reqRepo().findOne({
        where: { id: requisitoId, expedienteId: expediente.id },
      });
      if (!requisito) {
        fs.unlink(req.file.path, () => undefined);
        throw badRequest('El requisito no pertenece a este expediente');
      }
    }

    const descripcion =
      typeof req.body.descripcion === 'string' && req.body.descripcion.trim()
        ? req.body.descripcion.trim()
        : null;

    const doc = docRepo().create({
      expedienteId: expediente.id,
      requisitoId,
      tipo: tipoParsed.data,
      nombreOriginal: req.file.originalname,
      nombreArchivo: req.file.filename,
      mime: req.file.mimetype,
      tamano: req.file.size,
      ruta: path.resolve(req.file.path),
      descripcion,
      fechaSubida: new Date(),
    });

    const saved = await docRepo().save(doc);
    const full = await docRepo().findOne({
      where: { id: saved.id },
      relations: ['requisito'],
    });
    res.status(201).json(full);
  }),
);

export default router;
