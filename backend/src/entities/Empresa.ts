import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('empresa')
export class Empresa {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id!: number;

  @Column({ type: 'varchar' })
  razonSocial!: string;

  @Column({ type: 'varchar' })
  ruc!: string;

  @Column({ type: 'varchar' })
  direccion!: string;

  @Column({ type: 'varchar' })
  representante!: string;
}
