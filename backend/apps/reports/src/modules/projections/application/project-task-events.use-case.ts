import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import {
  type TaskCreatedPayload,
  type TaskDeletedPayload,
  type TaskUpdatedPayload,
} from '@contracts/tasks';
import { TransactionManager } from '@platform/kernel';
import {
  TaskCompletion,
  TaskProjection,
  type TaskProjectionChange,
} from '../domain/task-projection.js';

/** Brings tasks events into the projection of their tenant's shard. */
@Injectable()
export class ProjectTaskEvents {
  constructor(
    private readonly projection: TaskProjection,
    private readonly shard: ShardScopes,
    private readonly transactions: TransactionManager,
  ) {}

  /**
   * Projects a created task into the task projection of its tenant.
   * @param event `TaskCreated` payload.
   */
  created(event: TaskCreatedPayload): Promise<void> {
    return this.apply(event.tenantId, {
      taskId: event.taskId,
      version: event.version,
      status: event.status,
      createdAt: new Date(event.createdAt),
    });
  }

  /**
   * Projects a task change into the task projection of its tenant.
   * @param event `TaskUpdated` payload.
   */
  updated(event: TaskUpdatedPayload): Promise<void> {
    return this.apply(event.tenantId, {
      taskId: event.taskId,
      version: event.version,
      status: event.statusAfter,
      ...(TaskCompletion.isDone(event.statusAfter) &&
      !TaskCompletion.isDone(event.statusBefore)
        ? { doneAt: new Date(event.updatedAt) }
        : {}),
    });
  }

  /**
   * Projects a deleted task into the task projection of its tenant.
   * @param event `TaskDeleted` payload.
   */
  deleted(event: TaskDeletedPayload): Promise<void> {
    return this.apply(event.tenantId, {
      taskId: event.taskId,
      version: event.version,
      status: event.status,
      removedAt: new Date(event.deletedAt),
    });
  }

  private apply(
    tenantId: string,
    change: Omit<TaskProjectionChange, 'done'>,
  ): Promise<void> {
    return this.shard.inTenantShard(tenantId, () =>
      this.transactions.runInTransaction(() =>
        this.projection.apply({
          ...change,
          done: TaskCompletion.isDone(change.status),
        }),
      ),
    );
  }
}
