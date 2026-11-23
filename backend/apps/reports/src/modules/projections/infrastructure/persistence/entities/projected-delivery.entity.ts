import { AuditedEntity } from '@platform/persistence';
import { Column, Entity, Index } from 'typeorm';

/** `proj_deliveries`: cada notificación del tenant y los canales por los que salió. */
@Entity({ name: 'proj_deliveries' })
@Index(
  'proj_deliveries_tenant_notification_key',
  ['tenantId', 'notificationId'],
  { unique: true },
)
export class ProjectedDeliveryEntity extends AuditedEntity {
  @Column({ type: 'uuid', name: 'notification_id', nullable: false })
  notificationId!: string;

  @Column({ type: 'varchar', length: 32, name: 'type', nullable: false })
  type!: string;

  @Column({ type: 'text', array: true, name: 'channels', nullable: false })
  channels!: string[];

  @Column({ type: 'timestamptz', name: 'notified_at', nullable: false })
  notifiedAt!: Date;
}
