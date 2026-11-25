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
 * Messages to publish, written in the transaction of the business change. `seq` breaks ties in the order of
 * `created_at` within a group. The partial indexes cover only the open rows, which are few: one to
 * go through them in order, another to find the due ones when many are scheduled for later (a destination
 * down) and another to look up the earlier open ones of a group. The retention one covers the closed ones.
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
