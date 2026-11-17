import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Evidencia } from './Evidencia';
import { Expediente } from './Expediente';

@Entity('requisito')
export class Requisito {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id!: number;

  @ManyToOne(() => Expediente, (expediente) => expediente.requisitos)
  expediente!: Expediente;

  @Column({ type: 'integer' })
  expedienteId!: number;

  @Column({ type: 'varchar' })
  departamento!: string;

  @Column({ type: 'varchar' })
  descripcion!: string;

  @Column({ type: 'varchar' })
  estado!: 'Pendiente' | 'Aprobado' | 'Rechazado';

  @Column({ type: 'varchar', nullable: true })
  responsable!: string | null;

  @Column({ type: 'datetime', nullable: true })
  fechaRevision!: Date | null;

  @Column({ type: 'text', nullable: true })
  observacion!: string | null;

  @OneToMany(() => Evidencia, (evidencia) => evidencia.requisito)
  evidencias!: Evidencia[];
}
