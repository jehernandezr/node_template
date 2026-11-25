import { AuditedEntity } from '@platform/persistence';
import { Column, Entity, Index } from 'typeorm';

/** `billing_members`: the billable members of each tenant, according to identity. */
@Entity({ name: 'billing_members' })
@Index('billing_members_tenant_user_key', ['tenantId', 'userId'], {
  unique: true,
})
export class BillingMemberEntity extends AuditedEntity {
  @Column({ type: 'uuid', name: 'user_id', nullable: false })
  userId!: string;
}
