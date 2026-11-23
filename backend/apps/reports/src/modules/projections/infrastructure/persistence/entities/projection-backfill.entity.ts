import { AuditedEntity } from '@platform/persistence';
import { Column, Entity, Index } from 'typeorm';

/** `proj_backfills`: hasta dónde se rellenó cada proyección de cada tenant desde el servicio dueño de sus datos. */
@Entity({ name: 'proj_backfills' })
@Index('proj_backfills_tenant_source_key', ['tenantId', 'source'], {
  unique: true,
})
export class ProjectionBackfillEntity extends AuditedEntity {
  @Column({ type: 'varchar', length: 16, name: 'source', nullable: false })
  source!: string;

  @Column({ type: 'text', name: 'cursor', nullable: true })
  cursor!: string | null;

  @Column({ type: 'boolean', name: 'completed', nullable: false })
  completed!: boolean;
}
