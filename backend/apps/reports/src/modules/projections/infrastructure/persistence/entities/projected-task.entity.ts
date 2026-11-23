import { AuditedEntity } from '@platform/persistence';
import { Column, Entity, Index } from 'typeorm';

/** `proj_tasks`: lo que reports sabe de cada tarea del tenant, con la versión de la tarea que lo produjo. */
@Entity({ name: 'proj_tasks' })
@Index('proj_tasks_tenant_task_key', ['tenantId', 'taskId'], { unique: true })
export class ProjectedTaskEntity extends AuditedEntity {
  @Column({ type: 'uuid', name: 'task_id', nullable: false })
  taskId!: string;

  @Column({ type: 'varchar', length: 16, name: 'status', nullable: false })
  status!: string;

  @Column({ type: 'timestamptz', name: 'task_created_at', nullable: true })
  taskCreatedAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'done_at', nullable: true })
  doneAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'removed_at', nullable: true })
  removedAt!: Date | null;

  @Column({ type: 'integer', name: 'source_version', nullable: false })
  sourceVersion!: number;
}
