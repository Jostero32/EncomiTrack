import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type RespuestaEsperada = 'SI' | 'NO';

@Entity('plantilla_requisito')
export class PlantillaRequisito {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id!: number;

  @Column({ type: 'varchar' })
  departamento!: string;

  @Column({ type: 'varchar' })
  pregunta!: string;

  @Column({ type: 'varchar' })
  respuestaEsperada!: RespuestaEsperada;

  @Column({ type: 'integer', default: 0 })
  orden!: number;
}
