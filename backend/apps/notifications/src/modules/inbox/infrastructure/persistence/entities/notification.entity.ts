import { TimestampTransformer, VersionedEntity } from '@platform/persistence';
import { Column, Entity, Index } from 'typeorm';

/** `notifications`, the inbox, in the user's shard. */
@Entity({ name: 'notifications' })
@Index('notifications_user_idx', ['userId', 'id'])
export class NotificationEntity extends VersionedEntity {
  @Column({ type: 'uuid', name: 'user_id', nullable: false })
  userId!: string;

  /** Null only in rows created before the column. */
  @Column({ type: 'uuid', name: 'home_tenant_id', nullable: true })
  homeTenantId!: string | null;

  @Column({ type: 'varchar', length: 32, name: 'type', nullable: false })
  type!: string;

  @Column({ type: 'varchar', length: 200, name: 'title', nullable: false })
  title!: string;

  @Column({ type: 'varchar', length: 1000, name: 'body', nullable: false })
  body!: string;

  @Column({ type: 'varchar', length: 35, name: 'locale', nullable: false })
  locale!: string;

  @Column({
    type: 'timestamptz',
    name: 'read_at',
    nullable: true,
    transformer: new TimestampTransformer(),
  })
  readAt!: Date | null;
}
