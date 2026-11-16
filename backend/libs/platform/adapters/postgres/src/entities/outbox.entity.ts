import { OutboxStatus, type MessageEnvelope } from '@platform/messaging';
import { TimestampTransformer } from '@platform/persistence';
import {
  Check,
  Column,
  Entity,
  Generated,
  Index,
  PrimaryColumn,
} from 'typeorm';
import { BigintNumberTransformer } from './bigint-number.transformer.js';
import { EnumSql } from './enum-sql.js';

const OPEN = `"status" IN (${EnumSql.list([OutboxStatus.Pending, OutboxStatus.Failed])})`;
const CLOSED = `"status" IN (${EnumSql.list([OutboxStatus.Published, OutboxStatus.Dead])})`;

/**
 * Mensajes por publicar, escritos en la transacción del cambio de negocio. `seq` desempata el orden de
 * `created_at` dentro de un grupo. Los índices parciales cubren solo las filas abiertas, que son pocas: uno para
 * recorrerlas en orden, otro para encontrar las vencidas cuando hay muchas programadas para después (un destino
 * caído) y otro para buscar los anteriores abiertos de un grupo. El de retención cubre las cerradas.
 */
@Entity({ name: 'outbox' })
@Check('outbox_status_check', `"status" IN (${EnumSql.of(OutboxStatus)})`)
@Index('outbox_open_idx', ['createdAt', 'seq'], { where: OPEN })
@Index('outbox_due_idx', ['nextAttemptAt'], { where: OPEN })
@Index('outbox_group_idx', ['groupId', 'createdAt', 'seq'], {
  where: `${OPEN} AND "group_id" IS NOT NULL`,
})
@Index('outbox_retention_idx', ['status', 'updatedAt'], { where: CLOSED })
export class OutboxEntity {
  @PrimaryColumn({ type: 'text', name: 'id' })
  id!: string;

  @Column({
    type: 'bigint',
    name: 'seq',
    nullable: false,
    transformer: new BigintNumberTransformer(),
  })
  @Generated('increment')
  seq!: number;

  @Column({ type: 'jsonb', name: 'envelope', nullable: false })
  envelope!: MessageEnvelope;

  @Column({ type: 'text', name: 'status', nullable: false })
  status!: OutboxStatus;

  @Column({ type: 'integer', name: 'attempts', nullable: false, default: 0 })
  attempts!: number;

  @Column({
    type: 'timestamptz',
    name: 'next_attempt_at',
    nullable: false,
    transformer: new TimestampTransformer(),
  })
  nextAttemptAt!: Date;

  @Column({
    type: 'timestamptz',
    name: 'created_at',
    nullable: false,
    transformer: new TimestampTransformer(),
  })
  createdAt!: Date;

  @Column({
    type: 'timestamptz',
    name: 'updated_at',
    nullable: false,
    transformer: new TimestampTransformer(),
  })
  updatedAt!: Date;

  @Column({ type: 'text', name: 'group_id', nullable: true })
  groupId!: string | null;

  @Column({ type: 'integer', name: 'delay_ms', nullable: true })
  delayMs!: number | null;

  @Column({ type: 'text', name: 'last_error', nullable: true })
  lastError!: string | null;

  @Column({ type: 'text', name: 'lease_owner', nullable: true })
  leaseOwner!: string | null;

  @Column({ type: 'text', name: 'lease_token', nullable: true })
  leaseToken!: string | null;

  @Column({
    type: 'timestamptz',
    name: 'lease_expires_at',
    nullable: true,
    transformer: new TimestampTransformer(),
  })
  leaseExpiresAt!: Date | null;
}
