import { AuditedEntity } from '@platform/persistence';
import { Column, Entity } from 'typeorm';

/** `tenant_access_versions`: the tenant's permission version. The id is the tenant's. */
@Entity({ name: 'tenant_access_versions' })
export class TenantAccessVersionEntity extends AuditedEntity {
  @Column({ type: 'integer', name: 'permission_version', nullable: false })
  permissionVersion!: number;
}
