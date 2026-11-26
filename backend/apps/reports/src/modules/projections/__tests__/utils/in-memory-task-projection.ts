import type { ShardScope } from '@platform/persistence';
import type {
  ActivityPoint,
  StatusCount,
} from '../../domain/projection-points.js';
import type { ReportRange } from '../../domain/report-range.js';
import {
  TaskProjection,
  type TaskProjectionChange,
} from '../../domain/task-projection.js';

/** A projected task as the table keeps it. */
export interface ProjectedTask extends Omit<TaskProjectionChange, 'done'> {
  readonly tenantId: string;
}

/**
 * In-memory `TaskProjection` with the merge rules of the table: a change with a newer task version replaces the status
 * and the completion, the creation and removal dates are kept once known, and an older version changes nothing else.
 */
export class InMemoryTaskProjection extends TaskProjection {
  private readonly rows = new Map<string, ProjectedTask>();

  constructor(private readonly scope: ShardScope) {
    super();
  }

  override async apply(change: TaskProjectionChange): Promise<void> {
    const tenantId = this.tenantId();
    const key = `${tenantId}:${change.taskId}`;
    const current = this.rows.get(key);
    const doneAt = change.done ? change.doneAt : undefined;
    if (current === undefined) {
      this.rows.set(key, {
        tenantId,
        taskId: change.taskId,
        version: change.version,
        status: change.status,
        doneAt,
        createdAt: change.createdAt,
        removedAt: change.removedAt,
      });
      return;
    }
    const newer = current.version < change.version;
    this.rows.set(key, {
      tenantId,
      taskId: change.taskId,
      version: Math.max(current.version, change.version),
      status: newer ? change.status : current.status,
      doneAt: newer
        ? change.done
          ? (doneAt ?? current.doneAt)
          : undefined
        : current.doneAt,
      createdAt: current.createdAt ?? change.createdAt,
      removedAt: current.removedAt ?? change.removedAt,
    });
  }

  override async statusCounts(
    range: ReportRange,
  ): Promise<readonly StatusCount[]> {
    const counts = new Map<StatusCount['status'], number>();
    for (const task of this.tasksOf(this.tenantId())) {
      const day = task.createdAt?.toISOString().slice(0, 10);
      if (
        task.removedAt === undefined &&
        day !== undefined &&
        day >= range.from &&
        day <= range.to
      ) {
        counts.set(task.status, (counts.get(task.status) ?? 0) + 1);
      }
    }
    return [...counts].map(([status, count]) => ({ status, count }));
  }

  override async activity(): Promise<readonly ActivityPoint[]> {
    return [];
  }

  /** The projected tasks of a tenant, as a later read would see them. */
  tasksOf(tenantId: string): readonly ProjectedTask[] {
    return [...this.rows.values()].filter((row) => row.tenantId === tenantId);
  }

  private tenantId(): string {
    const tenantId = this.scope.current()?.tenantId;
    if (tenantId === undefined) {
      throw new Error('the projection is only used inside a tenant scope');
    }
    return tenantId;
  }
}
