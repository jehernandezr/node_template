import { AuditedEntity } from '@platform/persistence';
import { Column, Entity, Index } from 'typeorm';

/** `subscriptions`: la suscripción de cada tenant, una por tenant. */
@Entity({ name: 'subscriptions' })
@Index('subscriptions_tenant_key', ['tenantId'], { unique: true })
@Index('subscriptions_status_period_idx', ['status', 'periodEnd'])
export class SubscriptionEntity extends AuditedEntity {
  @Column({ type: 'uuid', name: 'plan_id', nullable: false })
  planId!: string;

  @Column({ type: 'uuid', name: 'period_plan_id', nullable: false })
  periodPlanId!: string;

  @Column({ type: 'varchar', length: 16, name: 'status', nullable: false })
  status!: string;

  @Column({ type: 'date', name: 'period_start', nullable: false })
  periodStart!: string;

  @Column({ type: 'date', name: 'period_end', nullable: false })
  periodEnd!: string;

  @Column({ type: 'bigint', name: 'proration_minor', nullable: false })
  prorationMinor!: string;

  @Column({ type: 'timestamptz', name: 'past_due_since', nullable: true })
  pastDueSince!: Date | null;
}
