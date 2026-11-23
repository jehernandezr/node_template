import { Injectable } from '@nestjs/common';
import {
  type TaskCreatedPayload,
  type TaskDeletedPayload,
  type TaskUpdatedPayload,
} from '@contracts/tasks';
import { TransactionManager } from '@platform/kernel';
import { TenantShard } from '../../../shared/utils/tenant-shard.js';
import {
  TaskCompletion,
  TaskProjection,
  type TaskProjectionChange,
} from '../domain/task-projection.js';

/** Lleva los eventos de tasks a la proyección del shard de su tenant. */
@Injectable()
export class ProjectTaskEvents {
  constructor(
    private readonly projection: TaskProjection,
    private readonly shard: TenantShard,
    private readonly transactions: TransactionManager,
  ) {}

  created(event: TaskCreatedPayload): Promise<void> {
    return this.apply(event.tenantId, {
      taskId: event.taskId,
      version: event.version,
      status: event.status,
      createdAt: new Date(event.createdAt),
    });
  }

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
    return this.shard.run(tenantId, () =>
      this.transactions.runInTransaction(() =>
        this.projection.apply({
          ...change,
          done: TaskCompletion.isDone(change.status),
        }),
      ),
    );
  }
}
