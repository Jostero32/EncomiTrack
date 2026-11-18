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

  @Column({ type: 'varchar', nullable: true })
  ciudad!: string | null;

  /** Firmantes de la liquidación: Elaborado / Revisado / Aprobado. */
  @Column({ type: 'varchar', nullable: true })
  elaboradoNombre!: string | null;

  @Column({ type: 'varchar', nullable: true })
  elaboradoCargo!: string | null;

  @Column({ type: 'varchar', nullable: true })
  revisadoNombre!: string | null;

  @Column({ type: 'varchar', nullable: true })
  revisadoCargo!: string | null;

  @Column({ type: 'varchar', nullable: true })
  aprobadoNombre!: string | null;

  @Column({ type: 'varchar', nullable: true })
  aprobadoCargo!: string | null;
}
