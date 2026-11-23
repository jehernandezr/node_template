import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

/**
 * `email_messages`, en el catálogo: qué salió con qué plantilla y a qué huella, sin cuerpo ni dirección. Es
 * global por `messageId` porque un correo de identity puede no tener tenant (ADR 0030), y no lleva
 * `created_by` ni `updated_by` porque solo la escribe el servicio.
 */
@Entity({ name: 'email_messages' })
export class EmailMessageEntity {
  @PrimaryColumn({ type: 'uuid', name: 'message_id' })
  messageId!: string;

  @Column({ type: 'varchar', length: 64, name: 'template', nullable: false })
  template!: string;

  @Column({ type: 'integer', name: 'template_version', nullable: false })
  templateVersion!: number;

  @Column({
    type: 'varchar',
    length: 64,
    name: 'recipient_hash',
    nullable: false,
  })
  recipientHash!: string;

  @Column({ type: 'varchar', length: 16, name: 'status', nullable: false })
  status!: string;

  @Column({ type: 'varchar', length: 128, name: 'provider_id', nullable: true })
  providerId!: string | null;

  @Column({ type: 'varchar', length: 64, name: 'trace_id', nullable: true })
  traceId!: string | null;

  @VersionColumn({ name: 'version' })
  version?: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt?: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt?: Date;
}
