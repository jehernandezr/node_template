import { Audited, AuditedEntity } from '@platform/persistence';
import { Column, Entity, Index } from 'typeorm';

/** Smoke test order: one row per tenant order, with its status. */
@Audited()
@Entity({ name: 'smoke_orders' })
@Index('smoke_orders_tenant_status_idx', ['tenantId', 'status'])
export class SmokeOrderEntity extends AuditedEntity {
  @Column({ type: 'varchar', length: 120, name: 'customer', nullable: false })
  customer!: string;

  @Column({ type: 'varchar', length: 32, name: 'status', nullable: false })
  status!: string;
}
