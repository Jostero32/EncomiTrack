import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Trabajador } from './Trabajador';

export const TIPOS_BIEN = [
  'Equipo',
  'Herramienta',
  'Credencial',
  'Acceso a sistema',
  'Documento',
  'Otro',
] as const;
export type TipoBien = (typeof TIPOS_BIEN)[number];

export const DEPARTAMENTOS_RESPONSABLES = [
  'Talento Humano',
  'Sistemas',
  'Contabilidad',
  'Bodega',
  'Administrativo',
] as const;
export type DepartamentoResponsable = (typeof DEPARTAMENTOS_RESPONSABLES)[number];

export const ESTADOS_BIEN = ['Asignado', 'Devuelto', 'No aplica'] as const;
export type EstadoBien = (typeof ESTADOS_BIEN)[number];

@Entity('bien_asignado')
export class BienAsignado {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id!: number;

  @ManyToOne(() => Trabajador, (trabajador) => trabajador.bienes, {
    onDelete: 'CASCADE',
  })
  trabajador!: Trabajador;

  @Column({ type: 'integer' })
  trabajadorId!: number;

  @Column({ type: 'varchar' })
  tipo!: TipoBien;

  @Column({ type: 'varchar' })
  descripcion!: string;

  @Column({ type: 'varchar', nullable: true })
  codigoSerie!: string | null;

  @Column({ type: 'varchar' })
  departamentoResponsable!: DepartamentoResponsable;

  @Column({ type: 'date', nullable: true })
  fechaAsignacion!: string | null;

  @Column({ type: 'varchar', default: 'Asignado' })
  estado!: EstadoBien;

  @Column({ type: 'date', nullable: true })
  fechaDevolucion!: string | null;

  @Column({ type: 'text', nullable: true })
  observacion!: string | null;
}
