import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { decimalTransformer } from '../transformers';
import { BienAsignado } from './BienAsignado';
import { Expediente } from './Expediente';
import { Obligacion } from './Obligacion';
import { VacacionGozada } from './VacacionGozada';

export const TIPOS_VINCULO = [
  'Código de Trabajo',
  'Contrato',
  'Nombramiento',
] as const;
export type TipoVinculo = (typeof TIPOS_VINCULO)[number];

@Entity('trabajador')
export class Trabajador {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id!: number;

  @Column({ type: 'varchar', unique: true })
  cedula!: string;

  @Column({ type: 'varchar' })
  nombres!: string;

  @Column({ type: 'varchar' })
  apellidos!: string;

  @Column({ type: 'varchar' })
  cargo!: string;

  @Column({ type: 'varchar' })
  departamento!: string;

  @Column({ type: 'varchar', default: 'Código de Trabajo' })
  tipoVinculo!: TipoVinculo;

  @Column({ type: 'varchar', nullable: true })
  unidad!: string | null;

  @Column({ type: 'varchar', nullable: true })
  jefeInmediato!: string | null;

  @Column({ type: 'date' })
  fechaIngreso!: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: decimalTransformer,
  })
  remuneracion!: string;

  @Column({ type: 'varchar' })
  estado!: 'Activo' | 'Finalizado';

  @OneToMany(() => Expediente, (expediente) => expediente.trabajador)
  expedientes!: Expediente[];

  @OneToMany(() => BienAsignado, (bien) => bien.trabajador)
  bienes!: BienAsignado[];

  @OneToMany(() => Obligacion, (obligacion) => obligacion.trabajador)
  obligaciones!: Obligacion[];

  @OneToMany(() => VacacionGozada, (vacacion) => vacacion.trabajador)
  vacaciones!: VacacionGozada[];
}
