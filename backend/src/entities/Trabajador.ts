import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { decimalTransformer } from '../transformers';
import { Expediente } from './Expediente';

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
}
