import { TimestampTransformer } from '@platform/persistence';
import { Column, Entity, PrimaryColumn } from 'typeorm';

/** `user_tenants`: projection of the user's memberships in their shard. */
@Entity({ name: 'user_tenants' })
export class UserTenantEntity {
  @PrimaryColumn({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @PrimaryColumn({ type: 'uuid', name: 'tenant_id' })
  tenantId!: string;

  @Column({
    type: 'timestamptz',
    name: 'joined_at',
    nullable: false,
    transformer: new TimestampTransformer(),
  })
  joinedAt!: Date;
}
