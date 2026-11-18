import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { decimalTransformer } from '../transformers';
import { Expediente } from './Expediente';

export type RubroLiquidacion = {
  concepto: string;
  tipo: 'haber' | 'deduccion';
  valor: string;
  formula: string;
  origen: 'auto' | 'manual' | 'obligacion';
  /** id de la Obligacion descontada (solo origen 'obligacion'). */
  referenciaId?: number;
};

export type EntradasLiquidacion = {
  /** Días usados en el cálculo (saldo de períodos completos o valor editado). */
  diasVacacionesPendientesAnteriores?: number;
  /** Saldo calculado desde GET /trabajadores/:id/vacaciones. */
  diasVacacionesCalculados?: number;
  /** Días gozados imputados al período en curso (se restan del proporcional). */
  diasGozadosPeriodoEnCurso?: number;
  justificacionDiasVacaciones?: string | null;
  observaciones?: string | null;
  otrosHaberes?: Array<{
    concepto: string;
    valor: number | string;
    justificacion: string;
  }>;
  anticipos?: Array<{
    concepto: string;
    valor: number | string;
    justificacion: string;
  }>;
  otrasDeducciones?: Array<{
    concepto: string;
    valor: number | string;
    justificacion: string;
  }>;
};

@Entity('liquidacion')
export class Liquidacion {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id!: number;

  @OneToOne(() => Expediente, (expediente) => expediente.liquidacion)
  @JoinColumn()
  expediente!: Expediente;

  @Column({ type: 'integer' })
  expedienteId!: number;

  @Column({ type: 'simple-json' })
  entradas!: EntradasLiquidacion;

  @Column({ type: 'simple-json' })
  rubros!: RubroLiquidacion[];

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: decimalTransformer,
  })
  totalHaberes!: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: decimalTransformer,
  })
  totalDeducciones!: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: decimalTransformer,
  })
  neto!: string;

  @Column({ type: 'text', nullable: true })
  observaciones!: string | null;

  @Column({ type: 'boolean', default: false })
  confirmada!: boolean;

  @Column({ type: 'datetime', nullable: true })
  fechaConfirmacion!: Date | null;

  /** true si cambiaron deudas, vacaciones o datos del trabajador después de calcularla. */
  @Column({ type: 'boolean', default: false })
  desactualizada!: boolean;
}
