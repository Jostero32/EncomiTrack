import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { AppDataSource } from './data-source';
import { AprobacionDepartamento } from './entities/AprobacionDepartamento';
import { Documento } from './entities/Documento';
import { Empresa } from './entities/Empresa';
import { Expediente } from './entities/Expediente';
import { Liquidacion } from './entities/Liquidacion';
import { Requisito } from './entities/Requisito';
import { notFound } from './errors';
import { detallesRequisitos } from './paz-salvo-db';
import {
  buildAnexoVacacionesPdf,
  buildLiquidacionPdf,
  buildPazSalvoPdf,
} from './pdfs';
import { UPLOADS_DIR, ensureUploadsRoot } from './upload';
import { obtenerVacaciones } from './vacaciones';

export type PdfSistemaKind = 'paz-salvo' | 'liquidacion' | 'anexo-vacaciones';

export function nombrePdfSistema(
  kind: PdfSistemaKind,
  numero: string,
): string {
  return `${kind}-${numero}.pdf`;
}

export async function getEmpresaOrFail(): Promise<Empresa> {
  const empresa = await AppDataSource.getRepository(Empresa).findOne({
    where: {},
    order: { id: 'ASC' },
  });
  if (!empresa) throw notFound('Empresa no configurada');
  return empresa;
}

export async function findDocumentoSistema(
  expedienteId: number,
  kind: PdfSistemaKind,
  numero: string,
): Promise<Documento | null> {
  return AppDataSource.getRepository(Documento).findOne({
    where: {
      expedienteId,
      tipo: 'Generado por el sistema',
      nombreOriginal: nombrePdfSistema(kind, numero),
    },
    order: { id: 'DESC' },
  });
}

export async function readDocumentoFile(doc: Documento): Promise<Buffer> {
  if (!fs.existsSync(doc.ruta)) {
    throw notFound('Archivo generado no encontrado en disco');
  }
  return fs.readFileSync(doc.ruta);
}

async function savePdfAsDocumento(params: {
  expedienteId: number;
  kind: PdfSistemaKind;
  numero: string;
  buffer: Buffer;
  descripcion: string;
}): Promise<Documento> {
  ensureUploadsRoot();
  const dir = path.join(UPLOADS_DIR, String(params.expedienteId));
  fs.mkdirSync(dir, { recursive: true });
  const nombreArchivo = `${randomUUID()}.pdf`;
  const ruta = path.resolve(dir, nombreArchivo);
  fs.writeFileSync(ruta, params.buffer);

  const repo = AppDataSource.getRepository(Documento);
  const existing = await findDocumentoSistema(
    params.expedienteId,
    params.kind,
    params.numero,
  );
  if (existing) {
    if (fs.existsSync(existing.ruta)) {
      try {
        fs.unlinkSync(existing.ruta);
      } catch {
        /* ignore */
      }
    }
    existing.nombreArchivo = nombreArchivo;
    existing.ruta = ruta;
    existing.tamano = params.buffer.length;
    existing.descripcion = params.descripcion;
    existing.fechaSubida = new Date();
    existing.mime = 'application/pdf';
    return repo.save(existing);
  }

  return repo.save(
    repo.create({
      expedienteId: params.expedienteId,
      requisitoId: null,
      tipo: 'Generado por el sistema',
      nombreOriginal: nombrePdfSistema(params.kind, params.numero),
      nombreArchivo,
      mime: 'application/pdf',
      tamano: params.buffer.length,
      ruta,
      descripcion: params.descripcion,
      fechaSubida: new Date(),
    }),
  );
}

export async function generarPazSalvoBuffer(
  expediente: Expediente,
): Promise<Buffer> {
  const empresa = await getEmpresaOrFail();
  const requisitos = await AppDataSource.getRepository(Requisito).find({
    where: { expedienteId: expediente.id },
    order: { orden: 'ASC', id: 'ASC' },
  });
  const aprobaciones = await AppDataSource.getRepository(AprobacionDepartamento).find({
    where: { expedienteId: expediente.id },
  });
  const detalles = await detallesRequisitos(AppDataSource.manager, requisitos);
  return buildPazSalvoPdf(empresa, expediente, requisitos, aprobaciones, detalles);
}

export async function generarLiquidacionBuffer(
  expediente: Expediente,
  liquidacion: Liquidacion,
): Promise<Buffer> {
  const empresa = await getEmpresaOrFail();
  return buildLiquidacionPdf(empresa, expediente, liquidacion);
}

export async function generarAnexoVacacionesBuffer(
  expediente: Expediente,
): Promise<{ buffer: Buffer; diasALiquidar: number }> {
  const empresa = await getEmpresaOrFail();
  const vac = await obtenerVacaciones(
    expediente.trabajadorId,
    expediente.fechaIngreso,
    expediente.fechaSalida,
  );
  const diasALiquidar = vac.saldoPeriodosCompletos;
  const buffer = await buildAnexoVacacionesPdf(
    empresa,
    expediente,
    vac.periodos,
    vac.gozadas,
    diasALiquidar,
  );
  return { buffer, diasALiquidar };
}

/** Genera y guarda los 3 PDF del sistema en el expediente digital. */
export async function generarYGuardarPdfsSistema(
  expediente: Expediente,
  liquidacion: Liquidacion,
): Promise<void> {
  const paz = await generarPazSalvoBuffer(expediente);
  const liq = await generarLiquidacionBuffer(expediente, liquidacion);
  const { buffer: anexo, diasALiquidar } =
    await generarAnexoVacacionesBuffer(expediente);

  await savePdfAsDocumento({
    expedienteId: expediente.id,
    kind: 'paz-salvo',
    numero: expediente.numero,
    buffer: paz,
    descripcion: 'Certificado de paz y salvo (copia fija al finalizar)',
  });
  await savePdfAsDocumento({
    expedienteId: expediente.id,
    kind: 'liquidacion',
    numero: expediente.numero,
    buffer: liq,
    descripcion: 'Liquidación de haberes (copia fija al finalizar)',
  });
  await savePdfAsDocumento({
    expedienteId: expediente.id,
    kind: 'anexo-vacaciones',
    numero: expediente.numero,
    buffer: anexo,
    descripcion: `Anexo de vacaciones — ${diasALiquidar} días a liquidar (copia fija al finalizar)`,
  });
}
