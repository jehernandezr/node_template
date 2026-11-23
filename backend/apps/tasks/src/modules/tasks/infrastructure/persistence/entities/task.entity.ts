import { AuditedEntity } from '@platform/persistence';
import { Column, Entity, Index } from 'typeorm';

/** `tasks`, en el shard del tenant. `created_by` es el usuario que la creó y esta columna, su tenant de origen. */
@Entity({ name: 'tasks' })
@Index('tasks_tenant_status_idx', ['tenantId', 'status', 'id'])
@Index('tasks_tenant_updated_idx', ['tenantId', 'updatedAt', 'id'])
export class TaskEntity extends AuditedEntity {
  @Column({ type: 'varchar', length: 200, name: 'title', nullable: false })
  title!: string;

  @Column({ type: 'text', name: 'description', nullable: false })
  description!: string;

  @Column({ type: 'varchar', length: 16, name: 'status', nullable: false })
  status!: string;

  @Column({ type: 'uuid', name: 'created_by_home_tenant_id', nullable: false })
  createdByHomeTenantId!: string;
}
