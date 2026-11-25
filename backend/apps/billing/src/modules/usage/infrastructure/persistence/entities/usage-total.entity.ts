import { AuditedEntity } from '@platform/persistence';
import { Column, Entity, Index } from 'typeorm';

/** `usage_totals`: usage per tenant, day and metric; a period sums or takes the maximum of its days. */
@Entity({ name: 'usage_totals' })
@Index('usage_totals_tenant_day_metric_key', ['tenantId', 'day', 'metric'], {
  unique: true,
})
export class UsageTotalEntity extends AuditedEntity {
  @Column({ type: 'date', name: 'day', nullable: false })
  day!: string;

  @Column({ type: 'varchar', length: 32, name: 'metric', nullable: false })
  metric!: string;

  @Column({ type: 'bigint', name: 'quantity', nullable: false })
  quantity!: string;
}
