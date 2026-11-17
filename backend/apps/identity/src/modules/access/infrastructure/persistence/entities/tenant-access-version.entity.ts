import { AuditedEntity } from '@platform/persistence';
import { Column, Entity } from 'typeorm';

/** `tenant_access_versions`: versión de permisos del tenant. El id es el del tenant. */
@Entity({ name: 'tenant_access_versions' })
export class TenantAccessVersionEntity extends AuditedEntity {
  @Column({ type: 'integer', name: 'permission_version', nullable: false })
  permissionVersion!: number;
}
