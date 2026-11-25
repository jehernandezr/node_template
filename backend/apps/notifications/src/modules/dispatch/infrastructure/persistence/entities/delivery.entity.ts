import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

/**
 * `notification_deliveries`, one row per notification and channel, in the user's shard. Without `created_by` or
 * `updated_by`: it is always written by the service itself, never by a user's action.
 */
@Entity({ name: 'notification_deliveries' })
@Index('notification_deliveries_notification_idx', ['notificationId'])
@Index('notification_deliveries_retry_idx', ['status', 'nextAttemptAt'])
export class DeliveryEntity {
  @PrimaryColumn({ type: 'uuid', name: 'id' })
  id!: string;

  @Column({ type: 'uuid', name: 'notification_id', nullable: false })
  notificationId!: string;

  @Column({ type: 'uuid', name: 'user_id', nullable: false })
  userId!: string;

  @Column({ type: 'uuid', name: 'home_tenant_id', nullable: false })
  homeTenantId!: string;

  @Column({ type: 'varchar', length: 16, name: 'channel', nullable: false })
  channel!: string;

  @Column({ type: 'varchar', length: 16, name: 'status', nullable: false })
  status!: string;

  @Column({ type: 'integer', name: 'attempts', nullable: false })
  attempts!: number;

  @Column({ type: 'varchar', length: 200, name: 'title', nullable: false })
  title!: string;

  @Column({ type: 'varchar', length: 1000, name: 'body', nullable: false })
  body!: string;

  @Column({ type: 'varchar', length: 35, name: 'locale', nullable: false })
  locale!: string;

  @Column({ type: 'timestamptz', name: 'next_attempt_at', nullable: false })
  nextAttemptAt!: Date;

  @Column({ type: 'varchar', length: 128, name: 'provider_id', nullable: true })
  providerId!: string | null;

  @Column({ type: 'varchar', length: 500, name: 'error', nullable: true })
  error!: string | null;

  @VersionColumn({ name: 'version' })
  version?: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt?: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt?: Date;
}
