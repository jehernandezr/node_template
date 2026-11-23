import { VersionedEntity } from '@platform/persistence';
import { Column, Entity, Index } from 'typeorm';

/** `notification_preferences`, una fila por usuario en su shard. */
@Entity({ name: 'notification_preferences' })
export class NotificationPreferencesEntity extends VersionedEntity {
  @Index('notification_preferences_user_key', { unique: true })
  @Column({ type: 'uuid', name: 'user_id', nullable: false })
  userId!: string;

  @Column({ type: 'jsonb', name: 'enabled', nullable: false })
  enabled!: Array<{ type: string; channels: string[] }>;

  @Column({ type: 'varchar', length: 5, name: 'quiet_start', nullable: false })
  quietStart!: string;

  @Column({ type: 'varchar', length: 5, name: 'quiet_end', nullable: false })
  quietEnd!: string;

  @Column({ type: 'varchar', length: 64, name: 'timezone', nullable: false })
  timezone!: string;
}
