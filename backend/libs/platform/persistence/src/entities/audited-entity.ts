import { Column } from 'typeorm';
import { VersionedEntity } from './versioned-entity.js';

/**
 * Tenant entity: adds the tenant that owns the row and who created it and last changed it.
 * `TenantIsolatedRepository.insertOwned` and `updateOwned` fill the three fields from the scope and the request context.
 */
export abstract class AuditedEntity extends VersionedEntity {
  @Column({ type: 'uuid', name: 'tenant_id', nullable: false })
  tenantId!: string;

  @Column({ type: 'varchar', length: 64, name: 'created_by', nullable: true })
  createdBy?: string | null;

  @Column({ type: 'varchar', length: 64, name: 'updated_by', nullable: true })
  updatedBy?: string | null;
}
