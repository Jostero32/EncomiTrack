import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Expediente } from './Expediente';
import { Requisito } from './Requisito';

export const TIPOS_DOCUMENTO = [
  'Carta de renuncia',
  'Notificación de despido',
  'Acta de entrega-recepción',
  'Informe de gestión',
  'Acción de personal',
  'Comprobante de pago',
  'Anexo de vacaciones',
  'Generado por el sistema',
  'Otro',
] as const;

export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

@Entity('documento')
export class Documento {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id!: number;

  @ManyToOne(() => Expediente, (expediente) => expediente.documentos, {
    nullable: false,
  })
  expediente!: Expediente;

  @Column({ type: 'integer' })
  expedienteId!: number;

  @ManyToOne(() => Requisito, (requisito) => requisito.documentos, {
    nullable: true,
  })
  requisito!: Requisito | null;

  @Column({ type: 'integer', nullable: true })
  requisitoId!: number | null;

  @Column({ type: 'varchar' })
  tipo!: TipoDocumento;

  @Column({ type: 'varchar' })
  nombreOriginal!: string;

  @Column({ type: 'varchar' })
  nombreArchivo!: string;

  @Column({ type: 'varchar' })
  mime!: string;

  @Column({ type: 'integer' })
  tamano!: number;

  @Column({ type: 'varchar' })
  ruta!: string;

  @Column({ type: 'text', nullable: true })
  descripcion!: string | null;

  @Column({ type: 'datetime' })
  fechaSubida!: Date;
}

/** Tipos sugeridos según la causa (advertencia, no bloquea). */
export function tiposDocumentoSugeridos(
  causa: string,
): TipoDocumento[] {
  const comunes: TipoDocumento[] = [
    'Acta de entrega-recepción',
    'Informe de gestión',
  ];
  if (causa === 'Renuncia voluntaria') {
    return ['Carta de renuncia', ...comunes];
  }
  if (causa === 'Despido intempestivo') {
    return ['Notificación de despido', ...comunes];
  }
  return [...comunes];
}
