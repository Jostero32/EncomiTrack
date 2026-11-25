import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { decimalTransformer } from '../transformers';
import { AprobacionDepartamento } from './AprobacionDepartamento';
import { Documento } from './Documento';
import { Liquidacion } from './Liquidacion';
import { Requisito } from './Requisito';
import { Trabajador } from './Trabajador';

@Entity('expediente')
export class Expediente {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id!: number;

  @Column({ type: 'varchar', unique: true })
  numero!: string;

  @ManyToOne(() => Trabajador, (trabajador) => trabajador.expedientes, {
    eager: true,
  })
  trabajador!: Trabajador;

  @Column({ type: 'integer' })
  trabajadorId!: number;

  @Column({ type: 'date' })
  fechaIngreso!: string;

  @Column({ type: 'date' })
  fechaSalida!: string;

  @Column({ type: 'varchar' })
  causa!:
    | 'Renuncia voluntaria'
    | 'Desahucio'
    | 'Despido intempestivo'
    | 'Mutuo acuerdo'
    | 'Fin de contrato';

  @Column({ type: 'varchar' })
  region!: 'Sierra-Amazonía' | 'Costa-Galápagos';

  @Column({ type: 'boolean' })
  decimosMensualizados!: boolean;

  /** true: el fondo de reserva se paga en rol y el del último mes entra en la liquidación. */
  @Column({ type: 'boolean', default: false })
  fondosReservaMensualizados!: boolean;

  @Column({ type: 'varchar' })
  cargo!: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: decimalTransformer,
  })
  remuneracion!: string;

  @Column({ type: 'text', nullable: true })
  observaciones!: string | null;

  @Column({ type: 'varchar', nullable: true })
  responsable!: string | null;

  @Column({ type: 'varchar' })
  estado!: 'En proceso' | 'Paz y salvo aprobado' | 'Finalizado';

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @OneToMany(() => Requisito, (requisito) => requisito.expediente)
  requisitos!: Requisito[];

  @OneToMany(() => Documento, (documento) => documento.expediente)
  documentos!: Documento[];

  @OneToOne(() => Liquidacion, (liquidacion) => liquidacion.expediente)
  liquidacion!: Liquidacion | null;

  @OneToMany(() => AprobacionDepartamento, (a) => a.expediente)
  aprobaciones!: AprobacionDepartamento[];
}
