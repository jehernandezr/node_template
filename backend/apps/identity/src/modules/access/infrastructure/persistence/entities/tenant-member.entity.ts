import { AuditedEntity, TimestampTransformer } from '@platform/persistence';
import { Column, Entity, Index } from 'typeorm';

/** `tenant_members`: memberships of the tenant, with their groups and the departure a deletion reserved. */
@Entity({ name: 'tenant_members' })
@Index('tenant_members_user_key', ['tenantId', 'userId'], { unique: true })
export class TenantMemberEntity extends AuditedEntity {
  @Column({ type: 'uuid', name: 'user_id', nullable: false })
  userId!: string;

  @Column({ type: 'uuid', name: 'home_tenant_id', nullable: false })
  homeTenantId!: string;

  @Column({ type: 'jsonb', name: 'group_ids', nullable: false })
  groupIds!: string[];

  @Column({ type: 'integer', name: 'permission_version', nullable: false })
  permissionVersion!: number;

  @Column({
    type: 'timestamptz',
    name: 'joined_at',
    nullable: false,
    transformer: new TimestampTransformer(),
  })
  joinedAt!: Date;

  @Column({
    type: 'timestamptz',
    name: 'leaving_since',
    nullable: true,
    transformer: new TimestampTransformer(),
  })
  leavingSince!: Date | null;
}
