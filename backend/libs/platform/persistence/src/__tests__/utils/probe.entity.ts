import { Column, Entity, Index } from 'typeorm';
import { AuditedEntity } from '../../entities/audited-entity.js';
import { Audited } from '../../metadata/entity-metadata.js';

/** Sample tenant entity for the repository, transaction and migration tests. */
@Audited()
@Entity({ name: 'probes' })
@Index('probes_tenant_name_idx', ['tenantId', 'name'])
export class ProbeEntity extends AuditedEntity {
  @Column({ type: 'varchar', length: 120, name: 'name', nullable: false })
  name!: string;

  @Column({ type: 'int', name: 'priority', nullable: false, default: 0 })
  priority!: number;
}
