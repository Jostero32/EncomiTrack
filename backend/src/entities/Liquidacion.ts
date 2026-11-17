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
  origen: 'auto' | 'manual';
};

export type EntradasLiquidacion = {
  diasVacacionesPendientesAnteriores?: number;
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

  @Column({ type: 'boolean', default: false })
  confirmada!: boolean;

  @Column({ type: 'datetime', nullable: true })
  fechaConfirmacion!: Date | null;
}
