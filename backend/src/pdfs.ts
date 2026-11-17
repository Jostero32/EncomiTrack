import PdfPrinter from 'pdfmake';
import type {
  Content,
  TDocumentDefinitions,
  TFontDictionary,
} from 'pdfmake/interfaces';
import { tiempoServicio } from './calculos';
import { Empresa } from './entities/Empresa';
import { Expediente } from './entities/Expediente';
import { Liquidacion } from './entities/Liquidacion';
import { Requisito } from './entities/Requisito';

const fonts: TFontDictionary = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};

const printer = new PdfPrinter(fonts);

function empresaHeader(empresa: Empresa): Content {
  return {
    stack: [
      { text: empresa.razonSocial, style: 'header' },
      { text: `RUC: ${empresa.ruc}`, style: 'subheader' },
      { text: empresa.direccion, style: 'subheader' },
      { text: `Representante: ${empresa.representante}`, style: 'subheader' },
    ],
    margin: [0, 0, 0, 16],
  };
}

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  if (typeof value === 'string') return value;
  return value.toISOString().slice(0, 10);
}

export async function buildPazSalvoPdf(
  empresa: Empresa,
  expediente: Expediente,
  requisitos: Requisito[],
): Promise<Buffer> {
  const t = expediente.trabajador;
  const body: Content[] = [
    empresaHeader(empresa),
    { text: 'CERTIFICADO DE PAZ Y SALVO', style: 'title', margin: [0, 0, 0, 12] },
    {
      columns: [
        {
          stack: [
            { text: `Trabajador: ${t.nombres} ${t.apellidos}` },
            { text: `Cédula: ${t.cedula}` },
            { text: `Cargo: ${expediente.cargo}` },
            { text: `Departamento: ${t.departamento}` },
          ],
        },
        {
          stack: [
            { text: `Expediente: ${expediente.numero}` },
            { text: `Fecha ingreso: ${expediente.fechaIngreso}` },
            { text: `Fecha salida: ${expediente.fechaSalida}` },
            { text: `Causa: ${expediente.causa}` },
          ],
        },
      ],
      margin: [0, 0, 0, 16],
    },
    { text: 'Requisitos', style: 'section', margin: [0, 0, 0, 8] },
    {
      table: {
        headerRows: 1,
        widths: ['*', '*', 'auto', '*', 'auto'],
        body: [
          [
            { text: 'Departamento', style: 'tableHeader' },
            { text: 'Descripción', style: 'tableHeader' },
            { text: 'Estado', style: 'tableHeader' },
            { text: 'Responsable', style: 'tableHeader' },
            { text: 'Fecha', style: 'tableHeader' },
          ],
          ...requisitos.map((r) => [
            r.departamento,
            r.descripcion,
            r.estado,
            r.responsable || '—',
            formatDate(r.fechaRevision),
          ]),
        ],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
      },
      margin: [0, 0, 0, 40],
    },
    {
      columns: [
        {
          stack: [
            { text: '________________________', alignment: 'center' },
            { text: 'Talento Humano', alignment: 'center', margin: [0, 4, 0, 0] },
          ],
        },
        {
          stack: [
            { text: '________________________', alignment: 'center' },
            { text: 'Jefe inmediato', alignment: 'center', margin: [0, 4, 0, 0] },
          ],
        },
        {
          stack: [
            { text: '________________________', alignment: 'center' },
            { text: 'Trabajador', alignment: 'center', margin: [0, 4, 0, 0] },
          ],
        },
      ],
    },
  ];

  const doc: TDocumentDefinitions = {
    pageSize: 'A4',
    content: body,
    defaultStyle: { font: 'Helvetica', fontSize: 10 },
    styles: {
      header: { fontSize: 14, bold: true },
      subheader: { fontSize: 9, color: '#333' },
      title: { fontSize: 13, bold: true, alignment: 'center' },
      section: { fontSize: 11, bold: true },
      tableHeader: { bold: true, fontSize: 9 },
    },
  };

  return renderPdf(doc);
}

export async function buildLiquidacionPdf(
  empresa: Empresa,
  expediente: Expediente,
  liquidacion: Liquidacion,
): Promise<Buffer> {
  const t = expediente.trabajador;
  const { aniosCompletos, diasRestantes } = tiempoServicio(
    expediente.fechaIngreso,
    expediente.fechaSalida,
  );
  const haberes = liquidacion.rubros.filter((r) => r.tipo === 'haber');
  const deducciones = liquidacion.rubros.filter((r) => r.tipo === 'deduccion');

  const body: Content[] = [
    empresaHeader(empresa),
    { text: 'LIQUIDACIÓN DE HABERES', style: 'title', margin: [0, 0, 0, 12] },
    {
      stack: [
        { text: `Empleador: ${empresa.razonSocial}` },
        { text: `Trabajador: ${t.nombres} ${t.apellidos} — CI ${t.cedula}` },
        { text: `Fecha ingreso: ${expediente.fechaIngreso}` },
        { text: `Fecha salida: ${expediente.fechaSalida}` },
        {
          text: `Tiempo de servicio: ${aniosCompletos} año(s) y ${diasRestantes} día(s)`,
        },
        { text: `Causa: ${expediente.causa}` },
      ],
      margin: [0, 0, 0, 14],
    },
    { text: 'Haberes', style: 'section', margin: [0, 0, 0, 6] },
    {
      table: {
        headerRows: 1,
        widths: ['*', 'auto'],
        body: [
          [
            { text: 'Concepto', style: 'tableHeader' },
            { text: 'Valor', style: 'tableHeader' },
          ],
          ...haberes.map((r) => [r.concepto, r.valor]),
          [
            { text: 'Total haberes', bold: true },
            { text: liquidacion.totalHaberes, bold: true },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
      },
      margin: [0, 0, 0, 12],
    },
    { text: 'Deducciones', style: 'section', margin: [0, 0, 0, 6] },
    {
      table: {
        headerRows: 1,
        widths: ['*', 'auto'],
        body: [
          [
            { text: 'Concepto', style: 'tableHeader' },
            { text: 'Valor', style: 'tableHeader' },
          ],
          ...deducciones.map((r) => [r.concepto, r.valor]),
          [
            { text: 'Total deducciones', bold: true },
            { text: liquidacion.totalDeducciones, bold: true },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
      },
      margin: [0, 0, 0, 12],
    },
    {
      text: `Neto a recibir: ${liquidacion.neto}`,
      bold: true,
      fontSize: 12,
      margin: [0, 0, 0, 40],
    },
    {
      columns: [
        {
          stack: [
            { text: '________________________', alignment: 'center' },
            { text: 'Empleador', alignment: 'center', margin: [0, 4, 0, 0] },
          ],
        },
        {
          stack: [
            { text: '________________________', alignment: 'center' },
            { text: 'Trabajador', alignment: 'center', margin: [0, 4, 0, 0] },
          ],
        },
      ],
    },
    {
      text: 'Documento referencial académico',
      alignment: 'center',
      fontSize: 8,
      margin: [0, 40, 0, 0],
      color: '#666',
    },
  ];

  const doc: TDocumentDefinitions = {
    pageSize: 'A4',
    content: body,
    defaultStyle: { font: 'Helvetica', fontSize: 10 },
    styles: {
      header: { fontSize: 14, bold: true },
      subheader: { fontSize: 9, color: '#333' },
      title: { fontSize: 13, bold: true, alignment: 'center' },
      section: { fontSize: 11, bold: true },
      tableHeader: { bold: true, fontSize: 9 },
    },
  };

  return renderPdf(doc);
}

function renderPdf(doc: TDocumentDefinitions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const pdfDoc = printer.createPdfKitDocument(doc);
    const chunks: Buffer[] = [];
    pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
    pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
    pdfDoc.on('error', reject);
    pdfDoc.end();
  });
}
