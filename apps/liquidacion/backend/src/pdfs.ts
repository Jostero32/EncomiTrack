import PdfPrinter from 'pdfmake';
import type {
  Content,
  TableCell,
  TDocumentDefinitions,
  TFontDictionary,
} from 'pdfmake/interfaces';
import { tiempoServicio } from './calculos';
import { AprobacionDepartamento } from './entities/AprobacionDepartamento';
import { Empresa } from './entities/Empresa';
import { Expediente } from './entities/Expediente';
import { Liquidacion } from './entities/Liquidacion';
import { Requisito } from './entities/Requisito';
import { VacacionGozada } from './entities/VacacionGozada';
import type { PeriodoVacaciones } from './calculos';
import { ordenarAreas } from './paz-salvo';
import type { DetalleRequisito } from './paz-salvo-db';
import {
  ciudadDesdeDireccion,
  formatFechaCorta,
  formatFechaLarga,
  formatMoney,
  MARCA,
  metadatosLiquidacionPdf,
  periodosConSolicitudes,
} from './pdf-helpers';

const fonts: TFontDictionary = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};

const printer = new PdfPrinter(fonts);

const tableLayout = {
  hLineWidth: () => 0.6,
  vLineWidth: () => 0.6,
  hLineColor: () => '#444',
  vLineColor: () => '#444',
};

function empresaHeader(empresa: Empresa): Content {
  return {
    stack: [
      { text: empresa.razonSocial.toUpperCase(), style: 'header', alignment: 'center' },
      {
        text: `RUC: ${empresa.ruc}  ·  ${empresa.direccion}`,
        style: 'subheader',
        alignment: 'center',
      },
      {
        text: `Representante legal: ${empresa.representante}`,
        style: 'subheader',
        alignment: 'center',
      },
    ],
    margin: [0, 0, 0, 10],
  };
}

function mark(cond: boolean): string {
  return cond ? 'X' : '';
}

function cell(
  text: string,
  opts: Record<string, unknown> = {},
): TableCell {
  return { text, fontSize: 8, ...opts } as TableCell;
}

function lineaFirma(lineas: Content[], width: number | string = '*'): Content {
  return {
    width,
    stack: [{ text: '______________________________', alignment: 'center' }, ...lineas],
  } as Content;
}

/** Encabezado "Página X de Y" (todas las páginas). */
/** Franja de marca (azul · dorado · rojo) a todo el ancho de una página A4. */
function franjaMarca(): Content {
  const ancho = 595.28;
  return {
    canvas: [
      { type: 'rect', x: 0, y: 0, w: ancho * 0.6, h: 4, color: MARCA.azul },
      { type: 'rect', x: ancho * 0.6, y: 0, w: ancho * 0.2, h: 4, color: MARCA.dorado },
      { type: 'rect', x: ancho * 0.8, y: 0, w: ancho * 0.2, h: 4, color: MARCA.rojo },
    ],
  } as Content;
}

/** Encabezado de cada página: franja de marca y "Página X de Y". */
function headerPaginas(etiqueta: string) {
  return (currentPage: number, pageCount: number): Content => ({
    stack: [
      franjaMarca(),
      {
        columns: [
          { text: etiqueta, fontSize: 7, color: MARCA.gris },
          {
            text: `Página ${currentPage} de ${pageCount}`,
            alignment: 'right',
            fontSize: 7,
            color: MARCA.gris,
          },
        ],
        margin: [40, 10, 40, 0],
      },
    ],
  });
}

export async function buildPazSalvoPdf(
  empresa: Empresa,
  expediente: Expediente,
  requisitos: Requisito[],
  aprobaciones: AprobacionDepartamento[] = [],
  detalles: Map<number, DetalleRequisito> = new Map(),
): Promise<Buffer> {
  const t = expediente.trabajador;
  const nombre = `${t.nombres} ${t.apellidos}`;
  const ciudad = empresa.ciudad?.trim() || ciudadDesdeDireccion(empresa.direccion);
  const fecha = formatFechaLarga(expediente.fechaSalida);
  const aprobacionPorArea = new Map(aprobaciones.map((a) => [a.departamento, a]));

  const porDepto = new Map<string, Requisito[]>();
  const ordered = [...requisitos].sort((a, b) => a.orden - b.orden || a.id - b.id);
  for (const r of ordered) {
    if (!porDepto.has(r.departamento)) porDepto.set(r.departamento, []);
    porDepto.get(r.departamento)!.push(r);
  }

  const secciones: Content[] = [];
  for (const depto of ordenarAreas(porDepto.keys())) {
    const reqs = porDepto.get(depto)!;
    const aprobacion = aprobacionPorArea.get(depto);
    const responsable =
      aprobacion?.responsable ||
      reqs.find((r) => r.responsable)?.responsable ||
      '';

    const preguntaCell = (r: Requisito): TableCell => {
      const d = detalles.get(r.id);
      const extra =
        d?.origen === 'Bien'
          ? [d.codigoSerie ? `Serie ${d.codigoSerie}` : null, d.fechaAsignacion ? `asignado ${formatFechaCorta(d.fechaAsignacion)}` : null]
              .filter(Boolean)
              .join(' · ')
          : d?.origen === 'Obligacion'
            ? `${d.tipo} por ${formatMoney(d.valor)} del ${formatFechaCorta(d.fecha)}`
            : '';
      return {
        stack: [
          { text: r.pregunta, fontSize: 8 },
          ...(extra ? [{ text: extra, fontSize: 6.5, color: '#555' }] : []),
        ],
      } as TableCell;
    };

    secciones.push({
      unbreakable: reqs.length <= 8,
      stack: [
        { text: depto.toUpperCase(), style: 'section', margin: [0, 12, 0, 6] },
        {
          table: {
            headerRows: 1,
            widths: ['*', 28, 28, 28, '*'],
            body: [
              [
                cell('Pregunta', { style: 'tableHeader' }),
                cell('SÍ', { style: 'tableHeader', alignment: 'center' }),
                cell('NO', { style: 'tableHeader', alignment: 'center' }),
                cell('N/A', { style: 'tableHeader', alignment: 'center' }),
                cell('Observaciones', { style: 'tableHeader' }),
              ],
              ...reqs.map((r) => [
                preguntaCell(r),
                cell(mark(r.respuesta === 'SI'), { alignment: 'center', bold: true }),
                cell(mark(r.respuesta === 'NO'), { alignment: 'center', bold: true }),
                cell(mark(r.respuesta === 'N/A'), { alignment: 'center', bold: true }),
                cell(r.observacion || ''),
              ]),
            ],
          },
          layout: tableLayout,
        },
        {
          columns: [
            { width: '*', text: '' },
            lineaFirma(
              [
                { text: responsable || 'Responsable del área', alignment: 'center', bold: !!responsable, fontSize: 9, margin: [0, 3, 0, 0] },
                { text: aprobacion?.cargo || `Responsable de ${depto}`, alignment: 'center', fontSize: 8 },
                {
                  text: aprobacion
                    ? `Certificado el ${formatFechaCorta(aprobacion.fecha)}`
                    : 'Fecha: ____/____/________',
                  alignment: 'center',
                  fontSize: 7,
                  color: '#555',
                },
              ],
              220,
            ),
          ],
          margin: [0, 26, 0, 4],
        },
      ],
    } as Content);
  }

  const vinculos = ['Nombramiento', 'Contrato', 'Código de Trabajo'] as const;
  const vinculoMarcado = vinculos
    .map((v) => `${v} (${t.tipoVinculo === v ? 'x' : ' '})`)
    .join('   ');

  const body: Content[] = [
    {
      columns: [
        { width: '*', ...(empresaHeader(empresa) as object) } as unknown as Content,
        {
          width: 75,
          stack: [
            { qr: `${expediente.numero}|${t.cedula}`, fit: 70, alignment: 'right' },
            { text: expediente.numero, fontSize: 7, alignment: 'right', margin: [0, 2, 0, 0] },
          ],
        } as Content,
      ],
    },
    {
      text: 'CERTIFICADO DE PAZ Y SALVO PARA EL PAGO DE LIQUIDACIONES',
      style: 'title',
      margin: [0, 4, 0, 12],
    },
    {
      text: `${ciudad}, ${fecha}`,
      alignment: 'right',
      margin: [0, 0, 0, 8],
      italics: true,
    },
    { text: 'Declaración del trabajador', style: 'section', margin: [0, 0, 0, 6] },
    {
      text: [
        `Yo, `,
        { text: nombre, bold: true },
        `, con cédula de ciudadanía N.º ${t.cedula}, vinculado(a) a ${empresa.razonSocial} bajo la modalidad de: `,
        { text: vinculoMarcado, bold: true },
        `, con el cargo de ${expediente.cargo} en la unidad ${t.unidad || t.departamento}, ` +
          `cuyo jefe inmediato es ${t.jefeInmediato || '—'}, declaro que he procedido a la ` +
          `entrega de los documentos y bienes que me fueron asignados durante mi relación ` +
          `laboral, y que no mantengo pendientes con las áreas firmantes, para efectos del ` +
          `pago de mi liquidación de haberes.`,
      ],
      alignment: 'justify',
      margin: [0, 0, 0, 28],
      lineHeight: 1.25,
    },
    {
      columns: [
        { width: '*', text: '' },
        lineaFirma(
          [
            { text: nombre, alignment: 'center', margin: [0, 4, 0, 0], bold: true },
            { text: `C.C. ${t.cedula}`, alignment: 'center', fontSize: 9 },
            { text: 'Firma del trabajador', alignment: 'center', fontSize: 8, color: '#555' },
          ],
          220,
        ),
        { width: '*', text: '' },
      ],
      margin: [0, 0, 0, 16],
    },
    ...secciones,
    {
      text: 'Documento referencial académico',
      alignment: 'center',
      fontSize: 8,
      color: '#666',
      margin: [0, 24, 0, 0],
    },
  ];

  return renderPdf({
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    header: headerPaginas(`Paz y salvo · ${expediente.numero} · ${nombre}`),
    content: body,
    defaultStyle: { font: 'Helvetica', fontSize: 10 },
    styles: baseStyles(),
  });
}

export async function buildLiquidacionPdf(
  empresa: Empresa,
  expediente: Expediente,
  liquidacion: Liquidacion,
): Promise<Buffer> {
  const t = expediente.trabajador;
  const meta = metadatosLiquidacionPdf({
    remuneracion: expediente.remuneracion,
    fechaIngreso: expediente.fechaIngreso,
    fechaSalida: expediente.fechaSalida,
    region: expediente.region,
    decimosMensualizados: expediente.decimosMensualizados,
  });
  const diasVac =
    liquidacion.entradas?.diasVacacionesPendientesAnteriores ??
    liquidacion.entradas?.diasVacacionesCalculados ??
    0;

  const findRubro = (concepto: string) =>
    liquidacion.rubros.find((r) => r.concepto === concepto);

  const ingresosExtras = liquidacion.rubros.filter(
    (r) =>
      r.tipo === 'haber' &&
      ![
        'Sueldo pendiente',
        'Décimo tercero',
        'Décimo cuarto',
        'Vacaciones',
        'Indemnización',
        'Desahucio',
      ].includes(r.concepto),
  );
  const egresos = liquidacion.rubros.filter((r) => r.tipo === 'deduccion');

  const ingresoRows: TableCell[][] = [
    [
      cell('Concepto', { style: 'tableHeader' }),
      cell('# Meses', { style: 'tableHeader', alignment: 'center' }),
      cell('# Días', { style: 'tableHeader', alignment: 'center' }),
      cell('Valor', { style: 'tableHeader', alignment: 'right' }),
    ],
    [
      cell(`Sueldo pendiente`),
      cell('0', { alignment: 'center' }),
      cell(String(meta.diaSalida), { alignment: 'center' }),
      cell(formatMoney(findRubro('Sueldo pendiente')?.valor ?? '0'), {
        alignment: 'right',
      }),
    ],
    [
      cell(`Décimo tercero (${meta.periodoDecimoTercero})`),
      cell(String(meta.mesesDecimoTercero), { alignment: 'center' }),
      cell(String(meta.diasDecimoTercero), { alignment: 'center' }),
      cell(formatMoney(findRubro('Décimo tercero')?.valor ?? '0'), {
        alignment: 'right',
      }),
    ],
    [
      cell(`Décimo cuarto (${meta.periodoDecimoCuarto})`),
      cell('—', { alignment: 'center' }),
      cell(String(meta.diasDecimoCuarto), { alignment: 'center' }),
      cell(formatMoney(findRubro('Décimo cuarto')?.valor ?? '0'), {
        alignment: 'right',
      }),
    ],
    [
      cell('Vacaciones'),
      cell('—', { alignment: 'center' }),
      cell(String(diasVac), { alignment: 'center' }),
      cell(formatMoney(findRubro('Vacaciones')?.valor ?? '0'), {
        alignment: 'right',
      }),
    ],
  ];

  for (const concepto of ['Indemnización', 'Desahucio'] as const) {
    const r = findRubro(concepto);
    if (r && Number(r.valor) > 0) {
      ingresoRows.push([
        cell(concepto),
        cell('—', { alignment: 'center' }),
        cell('—', { alignment: 'center' }),
        cell(formatMoney(r.valor), { alignment: 'right' }),
      ]);
    }
  }
  for (const r of ingresosExtras) {
    if (Number(r.valor) <= 0) continue;
    ingresoRows.push([
      cell(r.concepto),
      cell('—', { alignment: 'center' }),
      cell('—', { alignment: 'center' }),
      cell(formatMoney(r.valor), { alignment: 'right' }),
    ]);
  }

  const egresoRows: TableCell[][] = [
    [
      cell('Concepto', { style: 'tableHeader' }),
      cell('Valor', { style: 'tableHeader', alignment: 'right' }),
    ],
    ...egresos.map((r) => [
      cell(r.concepto),
      cell(formatMoney(r.valor), { alignment: 'right' }),
    ]),
  ];
  if (egresos.length === 0) {
    egresoRows.push([cell('—'), cell(formatMoney(0), { alignment: 'right' })]);
  }

  const obsText =
    liquidacion.observaciones ||
    liquidacion.entradas?.observaciones ||
    '';
  const bullets = obsText
    .split(/\n|•|;/)
    .map((s) => s.trim())
    .filter(Boolean);

  const body: Content[] = [
    empresaHeader(empresa),
    { text: 'LIQUIDACIÓN DE HABERES', style: 'title', margin: [0, 4, 0, 6] },
    {
      text: `${empresa.ciudad?.trim() || ciudadDesdeDireccion(empresa.direccion)}, ${formatFechaLarga(expediente.fechaSalida)}`,
      alignment: 'right',
      italics: true,
      margin: [0, 0, 0, 8],
    },
    {
      table: {
        widths: ['*', '*'],
        body: [
          [
            cell(`Nombre: ${t.nombres} ${t.apellidos}`),
            cell(`Cédula: ${t.cedula}`),
          ],
          [
            cell(`Cargo: ${expediente.cargo}`),
            cell(
              `Tiempo: ${meta.mesesTrabajados} mes(es) y ${meta.diasTrabajados} día(s)`,
            ),
          ],
          [
            cell(`Fecha de término: ${formatFechaCorta(expediente.fechaSalida)}`),
            cell(`Causa: ${expediente.causa}`),
          ],
        ],
      },
      layout: tableLayout,
      margin: [0, 0, 0, 10],
    },
    { text: 'Valores unitarios', style: 'section', margin: [0, 4, 0, 4] },
    {
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto'],
        body: [
          [
            cell('Concepto', { style: 'tableHeader' }),
            cell('Valor por mes', { style: 'tableHeader', alignment: 'right' }),
            cell('Valor por día', { style: 'tableHeader', alignment: 'right' }),
          ],
          [
            cell('Sueldo'),
            cell(formatMoney(meta.valorMes.sueldo), { alignment: 'right' }),
            cell(formatMoney(meta.valorDia.sueldo), { alignment: 'right' }),
          ],
          [
            cell('Décimo tercero'),
            cell(formatMoney(meta.valorMes.decimoTercero), { alignment: 'right' }),
            cell(formatMoney(meta.valorDia.decimoTercero), { alignment: 'right' }),
          ],
          [
            cell('Décimo cuarto'),
            cell(formatMoney(meta.valorMes.decimoCuarto), { alignment: 'right' }),
            cell(formatMoney(meta.valorDia.decimoCuarto), { alignment: 'right' }),
          ],
          [
            cell('Vacaciones'),
            cell(formatMoney(meta.valorMes.vacaciones), { alignment: 'right' }),
            cell(formatMoney(meta.valorDia.vacaciones), { alignment: 'right' }),
          ],
        ],
      },
      layout: tableLayout,
      margin: [0, 0, 0, 10],
    },
    { text: 'INGRESOS', style: 'section', margin: [0, 4, 0, 4] },
    {
      table: {
        headerRows: 1,
        widths: ['*', 45, 40, 70],
        body: ingresoRows,
      },
      layout: tableLayout,
      margin: [0, 0, 0, 6],
    },
    {
      text: `Total de ingresos: ${formatMoney(liquidacion.totalHaberes)}`,
      bold: true,
      alignment: 'right',
      margin: [0, 0, 0, 10],
    },
    { text: 'EGRESOS', style: 'section', margin: [0, 4, 0, 4] },
    {
      table: {
        headerRows: 1,
        widths: ['*', 70],
        body: egresoRows,
      },
      layout: tableLayout,
      margin: [0, 0, 0, 6],
    },
    {
      text: `Total de egresos: ${formatMoney(liquidacion.totalDeducciones)}`,
      bold: true,
      alignment: 'right',
      margin: [0, 0, 0, 8],
    },
    {
      table: {
        widths: ['*', 'auto'],
        body: [
          [
            {
              text: 'TOTAL DE LIQUIDACIÓN',
              bold: true,
              fontSize: 11,
              fillColor: MARCA.azulSuave,
              color: MARCA.azul,
            },
            {
              text: formatMoney(liquidacion.neto),
              bold: true,
              fontSize: 11,
              alignment: 'right',
              fillColor: MARCA.azulSuave,
              color: MARCA.azul,
            },
          ],
        ],
      },
      layout: tableLayout,
      margin: [0, 0, 0, 12],
    },
    ...(bullets.length
      ? ([
          { text: 'Observaciones', style: 'section', margin: [0, 0, 0, 4] },
          {
            ul: bullets,
            margin: [0, 0, 0, 16],
            fontSize: 9,
          },
        ] as Content[])
      : []),
    {
      columns: [
        lineaFirma([
          { text: empresa.elaboradoNombre || '', alignment: 'center', fontSize: 9, margin: [0, 3, 0, 0] },
          { text: 'Elaborado por', alignment: 'center', bold: true },
          { text: empresa.elaboradoCargo || 'Talento Humano', alignment: 'center', fontSize: 8 },
        ]),
        lineaFirma([
          { text: empresa.revisadoNombre || '', alignment: 'center', fontSize: 9, margin: [0, 3, 0, 0] },
          { text: 'Revisado por', alignment: 'center', bold: true },
          { text: empresa.revisadoCargo || 'Contabilidad', alignment: 'center', fontSize: 8 },
        ]),
        lineaFirma([
          { text: empresa.aprobadoNombre || '', alignment: 'center', fontSize: 9, margin: [0, 3, 0, 0] },
          { text: 'Aprobado por', alignment: 'center', bold: true },
          { text: empresa.aprobadoCargo || 'Gerencia', alignment: 'center', fontSize: 8 },
        ]),
      ],
      columnGap: 12,
      unbreakable: true,
      margin: [0, 30, 0, 30],
    },
    {
      stack: [
        { text: '______________________________', alignment: 'center' },
        {
          text: 'Recibí conforme',
          alignment: 'center',
          bold: true,
          margin: [0, 4, 0, 0],
        },
        {
          text: `${t.nombres} ${t.apellidos} — C.C. ${t.cedula}`,
          alignment: 'center',
          fontSize: 9,
        },
      ],
    },
    {
      text: 'Documento referencial académico',
      alignment: 'center',
      fontSize: 8,
      color: '#666',
      margin: [0, 24, 0, 0],
    },
  ];

  return renderPdf({
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    header: headerPaginas(`Liquidación · ${expediente.numero} · ${t.nombres} ${t.apellidos}`),
    content: body,
    defaultStyle: { font: 'Helvetica', fontSize: 10 },
    styles: baseStyles(),
  });
}

export async function buildAnexoVacacionesPdf(
  empresa: Empresa,
  expediente: Expediente,
  periodos: PeriodoVacaciones[],
  gozadas: VacacionGozada[],
  diasALiquidar: number,
): Promise<Buffer> {
  const t = expediente.trabajador;
  const conSol = periodosConSolicitudes(periodos, gozadas);
  const { aniosCompletos, diasRestantes } = tiempoServicio(
    expediente.fechaIngreso,
    expediente.fechaSalida,
  );

  const secciones: Content[] = [];
  for (const p of conSol) {
    const solRows: TableCell[][] =
      p.solicitudes.length > 0
        ? [
            [
              cell('Fecha', { style: 'tableHeader' }),
              cell('Documento', { style: 'tableHeader' }),
              cell('Días', { style: 'tableHeader', alignment: 'right' }),
            ],
            ...p.solicitudes.map((s) => [
              cell(formatFechaCorta(s.fechaInicio)),
              cell(s.documento || '—'),
              cell(String(s.dias), { alignment: 'right' }),
            ]),
          ]
        : [
            [
              cell('Sin solicitudes gozadas en este período', {
                colSpan: 3,
                italics: true,
                color: '#666',
              }),
              cell(''),
              cell(''),
            ],
          ];

    secciones.push(
      {
        text: `Período ${p.numero}${p.completo ? '' : ' (en curso)'}`,
        style: 'section',
        margin: [0, 10, 0, 4],
      },
      {
        text: `Desde ${formatFechaCorta(p.desde)} hasta ${formatFechaCorta(p.hasta)}  ·  Generados: ${p.diasGenerados}  ·  Gozados: ${p.diasGozados}  ·  Saldo: ${p.saldo}`,
        fontSize: 9,
        margin: [0, 0, 0, 4],
      },
      {
        table: {
          widths: ['auto', '*', 50],
          body: solRows,
        },
        layout: tableLayout,
      },
    );
  }

  const body: Content[] = [
    empresaHeader(empresa),
    { text: 'ANEXO DE VACACIONES', style: 'title', margin: [0, 4, 0, 12] },
    {
      stack: [
        { text: `Trabajador: ${t.nombres} ${t.apellidos}` },
        { text: `Cédula: ${t.cedula}` },
        { text: `Cargo: ${expediente.cargo}` },
        {
          text: `Ingreso: ${formatFechaCorta(expediente.fechaIngreso)}  ·  Salida: ${formatFechaCorta(expediente.fechaSalida)}`,
        },
        {
          text: `Tiempo de servicio: ${aniosCompletos} año(s) y ${diasRestantes} día(s)`,
        },
      ],
      margin: [0, 0, 0, 10],
    },
    ...secciones,
    {
      table: {
        widths: ['*', 'auto'],
        body: [
          [
            {
              text: 'VACACIONES A LIQUIDAR',
              bold: true,
              fontSize: 11,
              fillColor: MARCA.azulSuave,
              color: MARCA.azul,
            },
            {
              text: `${diasALiquidar} días`,
              bold: true,
              fontSize: 11,
              alignment: 'right',
              fillColor: MARCA.azulSuave,
              color: MARCA.azul,
            },
          ],
        ],
      },
      layout: tableLayout,
      margin: [0, 16, 0, 30],
    },
    {
      columns: [
        {
          stack: [
            { text: '________________________', alignment: 'center' },
            { text: 'Elaborado', alignment: 'center', bold: true, margin: [0, 4, 0, 0] },
            { text: 'Talento Humano', alignment: 'center', fontSize: 8 },
          ],
        },
        {
          stack: [
            { text: '________________________', alignment: 'center' },
            { text: 'Aprobado', alignment: 'center', bold: true, margin: [0, 4, 0, 0] },
            { text: 'Gerencia', alignment: 'center', fontSize: 8 },
          ],
        },
      ],
    },
    {
      text: 'Documento referencial académico',
      alignment: 'center',
      fontSize: 8,
      color: '#666',
      margin: [0, 30, 0, 0],
    },
  ];

  return renderPdf({
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    header: headerPaginas(`Anexo de vacaciones · ${expediente.numero} · ${t.nombres} ${t.apellidos}`),
    content: body,
    defaultStyle: { font: 'Helvetica', fontSize: 10 },
    styles: baseStyles(),
  });
}

function baseStyles() {
  return {
    header: { fontSize: 12, bold: true, color: MARCA.azul },
    subheader: { fontSize: 8, color: '#333' },
    title: { fontSize: 12, bold: true, alignment: 'center' as const, color: MARCA.azul },
    section: { fontSize: 10, bold: true, color: MARCA.azul },
    tableHeader: { bold: true, fontSize: 8, fillColor: MARCA.azulSuave, color: MARCA.azulOscuro },
  };
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
