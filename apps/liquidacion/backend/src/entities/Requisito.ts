import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Documento } from './Documento';
import { Expediente } from './Expediente';

export type OrigenRequisito = 'Plantilla' | 'Bien' | 'Obligacion';
export type RespuestaRequisito = 'SI' | 'NO' | 'N/A';

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

  @Column({ type: 'varchar', default: 'Plantilla' })
  origen!: OrigenRequisito;

  /** id del BienAsignado u Obligacion de origen (null para Plantilla). */
  @Column({ type: 'integer', nullable: true })
  referenciaId!: number | null;

  @Column({ type: 'varchar', default: '' })
  pregunta!: string;

  @Column({ type: 'varchar', default: 'SI' })
  respuestaEsperada!: 'SI' | 'NO';

  /** null = pendiente de respuesta. */
  @Column({ type: 'varchar', nullable: true })
  respuesta!: RespuestaRequisito | null;

  /** Calculado: respuesta == esperada o N/A. */
  @Column({ type: 'boolean', default: false })
  cumple!: boolean;

  @Column({ type: 'integer', default: 0 })
  orden!: number;

  @Column({ type: 'varchar', nullable: true })
  responsable!: string | null;

  @Column({ type: 'datetime', nullable: true })
  fechaRevision!: Date | null;

  @Column({ type: 'text', nullable: true })
  observacion!: string | null;

  @OneToMany(() => Documento, (documento) => documento.requisito)
  documentos!: Documento[];
}

export function calcularCumple(
  respuesta: RespuestaRequisito | null,
  respuestaEsperada: 'SI' | 'NO',
): boolean {
  if (respuesta === null) return false;
  return respuesta === 'N/A' || respuesta === respuestaEsperada;
}
