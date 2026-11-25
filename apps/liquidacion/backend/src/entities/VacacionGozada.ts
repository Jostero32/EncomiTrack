import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Trabajador } from './Trabajador';

@Entity('vacacion_gozada')
export class VacacionGozada {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id!: number;

  @ManyToOne(() => Trabajador, (trabajador) => trabajador.vacaciones, {
    onDelete: 'CASCADE',
  })
  trabajador!: Trabajador;

  @Column({ type: 'integer' })
  trabajadorId!: number;

  @Column({ type: 'date' })
  fechaInicio!: string;

  @Column({ type: 'integer' })
  dias!: number;

  @Column({ type: 'varchar', nullable: true })
  documento!: string | null;

  @Column({ type: 'text', nullable: true })
  observacion!: string | null;
}
