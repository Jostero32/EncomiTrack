import Decimal from 'decimal.js';
import { describe, expect, it } from 'vitest';
import {
  calcularDesahucio,
  calcularFondosReserva,
  calcularIndemnizacion,
  calcularLiquidacion,
  calcularPeriodosVacaciones,
  formatoDecimalEc,
  calcularSueldoPendiente,
  calcularVacacionesDetalle,
  diasVacacionesPorPeriodo,
} from '../src/calculos';
import { calcularCumple } from '../src/entities/Requisito';
import { generarRequisitos, ordenarAreas } from '../src/paz-salvo';
import { remuneracionSchema } from '../src/validaciones';
import { PLANTILLA_DEFAULT } from '../src/requisitos-default';

const DEMO_GOZADAS = [
  { fechaInicio: '2023-07-10', dias: 15 },
  { fechaInicio: '2024-08-05', dias: 15 },
  { fechaInicio: '2025-07-14', dias: 15 },
  { fechaInicio: '2026-01-12', dias: 10 },
];

describe('calcularPeriodosVacaciones', () => {
  it('días por período: 15 + 1 adicional desde el 6.º año, máximo 15 adicionales', () => {
    expect(diasVacacionesPorPeriodo(1)).toBe(15);
    expect(diasVacacionesPorPeriodo(5)).toBe(15);
    expect(diasVacacionesPorPeriodo(6)).toBe(16);
    expect(diasVacacionesPorPeriodo(10)).toBe(20);
    expect(diasVacacionesPorPeriodo(20)).toBe(30);
    expect(diasVacacionesPorPeriodo(30)).toBe(30);
  });

  it('caso demo: imputa al período más antiguo con saldo', () => {
    const r = calcularPeriodosVacaciones('2022-03-01', '2026-11-18', DEMO_GOZADAS);
    const completos = r.periodos.filter((p) => p.completo);

    expect(completos.map((p) => [p.desde, p.hasta, p.diasGenerados, p.diasGozados, p.saldo])).toEqual([
      ['2022-03-01', '2023-02-28', 15, 15, 0],
      ['2023-03-01', '2024-02-29', 15, 15, 0],
      ['2024-03-01', '2025-02-28', 15, 15, 0],
      ['2025-03-01', '2026-02-28', 15, 10, 5],
    ]);
    const enCurso = r.periodos.find((p) => !p.completo);
    expect(enCurso?.desde).toBe('2026-03-01');
    expect(enCurso?.hasta).toBe('2026-11-18');
    expect(enCurso?.diasGozados).toBe(0);
    expect(r.diasGozadosTotal).toBe(55);
    expect(r.saldoPeriodosCompletos).toBe(5);
  });

  it('el excedente de días gozados se imputa al período en curso', () => {
    const r = calcularPeriodosVacaciones('2024-01-01', '2025-06-30', [
      { fechaInicio: '2025-02-01', dias: 20 },
    ]);
    expect(r.periodos[0]).toMatchObject({ diasGenerados: 15, diasGozados: 15, saldo: 0 });
    expect(r.periodos[1]).toMatchObject({ completo: false, diasGozados: 5 });
    expect(r.saldoPeriodosCompletos).toBe(0);
  });
});

describe('calcularLiquidacion', () => {
  it('caso demo 2022-03-01 → 2026-11-18 despido intempestivo Sierra', () => {
    const vacaciones = calcularPeriodosVacaciones('2022-03-01', '2026-11-18', DEMO_GOZADAS);
    expect(vacaciones.saldoPeriodosCompletos).toBe(5);

    const detalle = calcularVacacionesDetalle({
      remuneracion: 800,
      fechaIngreso: '2022-03-01',
      fechaSalida: '2026-11-18',
      sueldoPendiente: calcularSueldoPendiente(800, '2026-11-18'),
      diasVacacionesPendientesAnteriores: vacaciones.saldoPeriodosCompletos,
    });
    expect(detalle.pendientes.toFixed(2)).toBe('133.33');
    expect(detalle.proporcional.toFixed(2)).toBe('286.67');
    expect(detalle.total.toFixed(2)).toBe('420.00');

    const resultado = calcularLiquidacion({
      remuneracion: 800,
      fechaIngreso: '2022-03-01',
      fechaSalida: '2026-11-18',
      causa: 'Despido intempestivo',
      region: 'Sierra-Amazonía',
      decimosMensualizados: false,
      diasVacacionesPendientesAnteriores: vacaciones.saldoPeriodosCompletos,
      obligaciones: [
        {
          concepto: 'Anticipo de sueldo octubre 2026',
          valor: 100,
          justificacion: 'Anticipo de sueldo',
        },
      ],
    });

    const porConcepto = Object.fromEntries(
      resultado.rubros.map((r) => [r.concepto, r.valor]),
    );

    expect(porConcepto['Sueldo pendiente']).toBe('480.00');
    expect(porConcepto['Vacaciones']).toBe('420.00');
    expect(porConcepto['Décimo tercero']).toBe('773.33');
    expect(porConcepto['Décimo cuarto']).toBe('144.60');
    expect(porConcepto['Indemnización']).toBe('4000.00');
    // 25 % × 800 × 4 años completos
    expect(porConcepto['Desahucio']).toBe('800.00');
    expect(resultado.totalHaberes).toBe('6617.93');
    expect(porConcepto['Aporte IESS 9.45%']).toBe('45.36');

    const anticipo = resultado.rubros.find((r) => r.origen === 'obligacion');
    expect(anticipo).toMatchObject({
      concepto: 'Anticipo de sueldo octubre 2026',
      tipo: 'deduccion',
      valor: '100.00',
      formula: 'Anticipo de sueldo',
    });
    expect(resultado.totalDeducciones).toBe('145.36');
    expect(resultado.neto).toBe('6472.57');
  });

  it('mantiene las deducciones manuales junto a las obligaciones', () => {
    const resultado = calcularLiquidacion({
      remuneracion: 800,
      fechaIngreso: '2022-03-01',
      fechaSalida: '2026-11-18',
      causa: 'Despido intempestivo',
      region: 'Sierra-Amazonía',
      decimosMensualizados: false,
      diasVacacionesPendientesAnteriores: 5,
      obligaciones: [{ concepto: 'Anticipo', valor: 100, justificacion: 'x' }],
      otrasDeducciones: [{ concepto: 'Multa', valor: 10, justificacion: 'y' }],
    });
    expect(resultado.totalDeducciones).toBe('155.36');
    expect(new Decimal(resultado.neto).toFixed(2)).toBe('6462.57');
  });
});

describe('paz y salvo', () => {
  it('genera requisitos de plantilla, bienes asignados y obligaciones pendientes', () => {
    const plantilla = PLANTILLA_DEFAULT.map((p, i) => ({ ...p, id: i + 1 }));
    const base = {
      trabajadorId: 1,
      fechaAsignacion: null,
      fechaDevolucion: null,
      observacion: null,
    } as const;
    const bienes = [
      {
        ...base,
        id: 10,
        tipo: 'Equipo',
        descripcion: 'Laptop Dell Latitude 5420',
        codigoSerie: 'DL5420-0193',
        departamentoResponsable: 'Sistemas',
        estado: 'Asignado',
      },
      {
        ...base,
        id: 11,
        tipo: 'Credencial',
        descripcion: 'Credencial institucional N.º 0457',
        codigoSerie: null,
        departamentoResponsable: 'Talento Humano',
        estado: 'Asignado',
      },
      {
        ...base,
        id: 12,
        tipo: 'Otro',
        descripcion: 'Ya devuelto',
        codigoSerie: null,
        departamentoResponsable: 'Bodega',
        estado: 'Devuelto',
      },
    ];
    const obligaciones = [
      {
        id: 20,
        trabajadorId: 1,
        tipo: 'Anticipo',
        concepto: 'Anticipo de sueldo octubre 2026',
        valor: '100.00',
        fecha: '2026-10-15',
        estado: 'Pendiente',
        justificacion: null,
      },
      {
        id: 21,
        trabajadorId: 1,
        tipo: 'Préstamo',
        concepto: 'Pagado',
        valor: '50.00',
        fecha: '2026-01-15',
        estado: 'Pagada',
        justificacion: null,
      },
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reqs = generarRequisitos(plantilla, bienes as any, obligaciones as any);
    expect(reqs).toHaveLength(6 + 2 + 1);
    expect(reqs.filter((r) => r.origen === 'Bien').map((r) => [r.departamento, r.pregunta])).toEqual([
      ['Sistemas', '¿Devolvió equipo "Laptop Dell Latitude 5420" (serie DL5420-0193)?'],
      ['Talento Humano', '¿Devolvió credencial "Credencial institucional N.º 0457"?'],
    ]);
    const obl = reqs.find((r) => r.origen === 'Obligacion');
    expect(obl).toMatchObject({
      departamento: 'Contabilidad',
      referenciaId: 20,
      respuestaEsperada: 'NO',
      pregunta: '¿Tiene pendiente anticipo "Anticipo de sueldo octubre 2026" por $100,00?',
    });
  });

  it('cumple si la respuesta coincide con la esperada o es N/A', () => {
    expect(calcularCumple(null, 'SI')).toBe(false);
    expect(calcularCumple('SI', 'SI')).toBe(true);
    expect(calcularCumple('NO', 'SI')).toBe(false);
    expect(calcularCumple('NO', 'NO')).toBe(true);
    expect(calcularCumple('N/A', 'NO')).toBe(true);
  });
});

describe('vacaciones proporcionales', () => {
  it('resta los días gozados dentro del período en curso', () => {
    const base = {
      remuneracion: 900,
      fechaIngreso: '2023-03-01',
      fechaSalida: '2026-11-15',
      sueldoPendiente: calcularSueldoPendiente(900, '2026-11-15'),
    };
    // (8 × 900 + 450) / 24 = 318.75
    expect(calcularVacacionesDetalle(base).proporcional.toFixed(2)).toBe('318.75');
    // 318.75 − 1 día × 900/30 = 288.75
    const conGozado = calcularVacacionesDetalle({ ...base, diasGozadosPeriodoEnCurso: 1 });
    expect(conGozado.descuentoGozados.toFixed(2)).toBe('30.00');
    expect(conGozado.proporcional.toFixed(2)).toBe('288.75');
    // No baja de cero si el anticipo de vacaciones supera lo generado.
    expect(
      calcularVacacionesDetalle({ ...base, diasGozadosPeriodoEnCurso: 30 }).proporcional.toFixed(2),
    ).toBe('0.00');
  });

  it('la liquidación toma los días gozados del período en curso', () => {
    const r = calcularLiquidacion({
      remuneracion: 900,
      fechaIngreso: '2023-03-01',
      fechaSalida: '2026-11-15',
      causa: 'Fin de contrato',
      region: 'Sierra-Amazonía',
      decimosMensualizados: true,
      diasVacacionesPendientesAnteriores: 0,
      diasGozadosPeriodoEnCurso: 1,
    });
    expect(r.rubros.find((x) => x.concepto === 'Vacaciones')?.valor).toBe('288.75');
  });
});

describe('fondos de reserva', () => {
  const base = {
    fechaSalida: '2026-11-15',
    sueldoPendiente: new Decimal(450),
  };
  it('8,33 % del sueldo pendiente desde el segundo año, si está mensualizado', () => {
    expect(
      calcularFondosReserva({ ...base, fechaIngreso: '2023-03-01', mensualizados: true }).toFixed(2),
    ).toBe('37.49');
  });
  it('cero el primer año o si no está mensualizado', () => {
    expect(
      calcularFondosReserva({ ...base, fechaIngreso: '2026-01-01', mensualizados: true }).toFixed(2),
    ).toBe('0.00');
    expect(
      calcularFondosReserva({ ...base, fechaIngreso: '2023-03-01', mensualizados: false }).toFixed(2),
    ).toBe('0.00');
  });
});

describe('desahucio e indemnización por causa', () => {
  const base = { remuneracion: 900, fechaIngreso: '2023-03-01', fechaSalida: '2026-11-15' };
  it('renuncia, mutuo acuerdo, desahucio y despido pagan 25 % por año completo (art. 184, 185, 188)', () => {
    for (const causa of ['Renuncia voluntaria', 'Mutuo acuerdo', 'Desahucio', 'Despido intempestivo'] as const) {
      expect(calcularDesahucio({ ...base, causa }).toFixed(2)).toBe('675.00');
    }
    expect(calcularDesahucio({ ...base, causa: 'Fin de contrato' }).toFixed(2)).toBe('0.00');
  });
  it('solo el despido intempestivo genera indemnización', () => {
    expect(calcularIndemnizacion({ ...base, causa: 'Despido intempestivo' }).toFixed(2)).toBe('3600.00');
    expect(calcularIndemnizacion({ ...base, causa: 'Renuncia voluntaria' }).toFixed(2)).toBe('0.00');
    expect(calcularIndemnizacion({ ...base, causa: 'Mutuo acuerdo' }).toFixed(2)).toBe('0.00');
  });
});

describe('remuneración mínima', () => {
  it('rechaza valores menores al SBU', () => {
    expect(remuneracionSchema.safeParse(120).success).toBe(false);
    expect(remuneracionSchema.safeParse('481.99').success).toBe(false);
    expect(remuneracionSchema.safeParse('482').success).toBe(true);
    expect(remuneracionSchema.safeParse(900).success).toBe(true);
  });
});

describe('formato es-EC', () => {
  it('usa punto de miles y coma decimal', () => {
    expect(formatoDecimalEc(200)).toBe('200,00');
    expect(formatoDecimalEc('2841.79')).toBe('2.841,79');
    expect(formatoDecimalEc(1234567.5)).toBe('1.234.567,50');
  });
});

describe('orden de áreas', () => {
  it('sigue ORDEN_AREAS; las desconocidas van antes de Talento Humano', () => {
    expect(
      ordenarAreas(['Talento Humano', 'Contabilidad', 'Administrativo', 'Sistemas', 'Jefe inmediato', 'Bodega', 'Sistemas']),
    ).toEqual(['Jefe inmediato', 'Sistemas', 'Bodega', 'Contabilidad', 'Administrativo', 'Talento Humano']);
  });
});

describe('caso demo: Andrea Paredes, renuncia 15/11/2026', () => {
  const GOZADAS = [
    { fechaInicio: '2024-08-05', dias: 15 },
    { fechaInicio: '2025-08-04', dias: 10 },
  ];

  it('vacaciones: 3 períodos completos (45 días) − 25 gozados = 20 días', () => {
    const v = calcularPeriodosVacaciones('2023-03-01', '2026-11-15', GOZADAS);
    expect(v.periodos.filter((p) => p.completo)).toHaveLength(3);
    expect(v.saldoPeriodosCompletos).toBe(20);
    expect(v.periodos.find((p) => !p.completo)?.diasGozados).toBe(0);
  });

  it('liquidación completa', () => {
    const v = calcularPeriodosVacaciones('2023-03-01', '2026-11-15', GOZADAS);
    const r = calcularLiquidacion({
      remuneracion: 900,
      fechaIngreso: '2023-03-01',
      fechaSalida: '2026-11-15',
      causa: 'Renuncia voluntaria',
      region: 'Sierra-Amazonía',
      decimosMensualizados: false,
      fondosReservaMensualizados: true,
      diasVacacionesPendientesAnteriores: v.saldoPeriodosCompletos,
      diasGozadosPeriodoEnCurso: 0,
      obligaciones: [{ concepto: 'Anticipo de sueldo noviembre 2026', valor: 200, justificacion: 'Anticipo' }],
    });
    const c = Object.fromEntries(r.rubros.map((x) => [x.concepto, x.valor]));
    expect(c['Sueldo pendiente']).toBe('450.00');
    expect(c['Décimo tercero']).toBe('862.50');
    expect(c['Décimo cuarto']).toBe('140.58');
    // 20 días × 30 = 600 (saldo) + 318.75 (proporcional). El plan esperaba 150 de
    // saldo (5 días) porque omitía el período 01/03/2025–28/02/2026.
    expect(c['Vacaciones']).toBe('918.75');
    expect(c['Desahucio']).toBe('675.00');
    expect(c['Indemnización']).toBe('0.00');
    expect(c['Fondos de reserva']).toBe('37.49');
    expect(c['Aporte IESS 9.45%']).toBe('42.53');
    expect(r.totalHaberes).toBe('3084.32');
    expect(r.totalDeducciones).toBe('242.53');
    expect(r.neto).toBe('2841.79');
  });
});

describe('tiempo trabajado (PDF de liquidación)', () => {
  it('cuenta meses calendario completos y días incluyendo el de salida', async () => {
    const { mesesYDiasTrabajados } = await import('../src/pdf-helpers');
    expect(mesesYDiasTrabajados('2023-03-01', '2026-11-15')).toEqual({ mesesTrabajados: 44, diasTrabajados: 15 });
    expect(mesesYDiasTrabajados('2026-11-01', '2026-11-30')).toEqual({ mesesTrabajados: 0, diasTrabajados: 30 });
  });
});
