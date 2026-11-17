import { describe, expect, it } from 'vitest';
import { calcularLiquidacion } from '../src/calculos';

describe('calcularLiquidacion', () => {
  it('caso de referencia 2022-03-01 → 2026-11-18 despido intempestivo Sierra', () => {
    const resultado = calcularLiquidacion({
      remuneracion: 800,
      fechaIngreso: '2022-03-01',
      fechaSalida: '2026-11-18',
      causa: 'Despido intempestivo',
      region: 'Sierra-Amazonía',
      decimosMensualizados: false,
      diasVacacionesPendientesAnteriores: 0,
      anticipos: [
        {
          concepto: 'Anticipo',
          valor: 100,
          justificacion: 'Anticipo de sueldo',
        },
      ],
    });

    const porConcepto = Object.fromEntries(
      resultado.rubros.map((r) => [r.concepto, r.valor]),
    );

    expect(porConcepto['Sueldo pendiente']).toBe('480.00');
    expect(porConcepto['Vacaciones']).toBe('286.67');
    expect(porConcepto['Décimo tercero']).toBe('773.33');
    expect(porConcepto['Décimo cuarto']).toBe('144.60');
    expect(porConcepto['Indemnización']).toBe('4000.00');
    expect(porConcepto['Desahucio']).toBe('943.56');
    expect(resultado.totalHaberes).toBe('6628.16');
    expect(porConcepto['Aporte IESS 9.45%']).toBe('45.36');
    expect(resultado.totalDeducciones).toBe('145.36');
    expect(resultado.neto).toBe('6482.80');
  });
});
