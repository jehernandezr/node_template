import { TimestampTransformer, VersionedEntity } from '@platform/persistence';
import { Column, Entity, Index } from 'typeorm';

/** `notifications`, la bandeja, en el shard del usuario. */
@Entity({ name: 'notifications' })
@Index('notifications_user_idx', ['userId', 'id'])
export class NotificationEntity extends VersionedEntity {
  @Column({ type: 'uuid', name: 'user_id', nullable: false })
  userId!: string;

  /** Nulo solo en las filas anteriores a la columna. */
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
