import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Requisito } from './Requisito';

@Entity('evidencia')
export class Evidencia {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id!: number;

  @ManyToOne(() => Requisito, (requisito) => requisito.evidencias)
  requisito!: Requisito;

  @Column({ type: 'integer' })
  requisitoId!: number;

  @Column({ type: 'varchar' })
  nombreOriginal!: string;

  @Column({ type: 'varchar' })
  ruta!: string;

  @Column({ type: 'varchar' })
  tipo!: string;

  @Column({ type: 'datetime' })
  fechaSubida!: Date;
}
