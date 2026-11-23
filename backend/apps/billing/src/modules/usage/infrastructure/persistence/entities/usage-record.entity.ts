import { AuditedEntity } from '@platform/persistence';
import { Column, Entity, Index } from 'typeorm';

/** `usage_records`: cada registro de uso recibido, único por tenant y llave de idempotencia. */
@Entity({ name: 'usage_records' })
@Index('usage_records_tenant_key_key', ['tenantId', 'key'], { unique: true })
export class UsageRecordEntity extends AuditedEntity {
  @Column({ type: 'varchar', length: 200, name: 'key', nullable: false })
  key!: string;

  @Column({ type: 'varchar', length: 32, name: 'metric', nullable: false })
  metric!: string;

  @Column({ type: 'bigint', name: 'quantity', nullable: false })
  quantity!: string;

  @Column({ type: 'timestamptz', name: 'window_start', nullable: false })
  windowStart!: Date;
}
