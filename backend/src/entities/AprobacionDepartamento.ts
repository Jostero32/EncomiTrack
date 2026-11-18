import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Expediente } from './Expediente';

/** Certificación de un área del paz y salvo por su responsable. */
@Entity('aprobacion_departamento')
@Index(['expedienteId', 'departamento'], { unique: true })
export class AprobacionDepartamento {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id!: number;

  @ManyToOne(() => Expediente, (expediente) => expediente.aprobaciones, {
    onDelete: 'CASCADE',
  })
  expediente!: Expediente;

  @Column({ type: 'integer' })
  expedienteId!: number;

  @Column({ type: 'varchar' })
  departamento!: string;

  @Column({ type: 'varchar' })
  responsable!: string;

  @Column({ type: 'varchar', nullable: true })
  cargo!: string | null;

  @Column({ type: 'datetime' })
  fecha!: Date;

  @Column({ type: 'text', nullable: true })
  observacion!: string | null;
}
