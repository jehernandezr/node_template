import { Column } from 'typeorm';
import { VersionedEntity } from './versioned-entity.js';

/**
 * Entidad de un tenant: suma el tenant dueño de la fila y quién la creó y la cambió por última vez.
 * `ShardedRepository` llena los tres campos desde el contexto de la petición.
 */
export abstract class AuditedEntity extends VersionedEntity {
  @Column({ type: 'uuid', name: 'tenant_id', nullable: false })
  tenantId!: string;

  @Column({ type: 'varchar', length: 64, name: 'created_by', nullable: true })
  createdBy?: string | null;

  @Column({ type: 'varchar', length: 64, name: 'updated_by', nullable: true })
  updatedBy?: string | null;
}
