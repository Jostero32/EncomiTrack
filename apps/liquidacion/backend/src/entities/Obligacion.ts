import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { decimalTransformer } from '../transformers';
import { Trabajador } from './Trabajador';

export const TIPOS_OBLIGACION = [
  'Anticipo',
  'Préstamo',
  'Caja chica',
  'Otro',
] as const;
export type TipoObligacion = (typeof TIPOS_OBLIGACION)[number];

/** 'Por descontar': se descuenta en la liquidación (queda Pagada al finalizar). */
export const ESTADOS_OBLIGACION = ['Pendiente', 'Por descontar', 'Pagada'] as const;
export type EstadoObligacion = (typeof ESTADOS_OBLIGACION)[number];

/** Deudas que siguen vigentes: generan requisito y se descuentan en la liquidación. */
export const ESTADOS_DEUDA_VIGENTE: readonly EstadoObligacion[] = ['Pendiente', 'Por descontar'];

@Entity('obligacion')
export class Obligacion {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id!: number;

  @ManyToOne(() => Trabajador, (trabajador) => trabajador.obligaciones, {
    onDelete: 'CASCADE',
  })
  trabajador!: Trabajador;

  @Column({ type: 'integer' })
  trabajadorId!: number;

  @Column({ type: 'varchar' })
  tipo!: TipoObligacion;

  @Column({ type: 'varchar' })
  concepto!: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: decimalTransformer,
  })
  valor!: string;

  @Column({ type: 'date' })
  fecha!: string;

  @Column({ type: 'varchar', default: 'Pendiente' })
  estado!: EstadoObligacion;

  @Column({ type: 'text', nullable: true })
  justificacion!: string | null;
}
