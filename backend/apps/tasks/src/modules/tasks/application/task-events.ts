import type { UserRef } from '@contracts/platform';
import type {
  TaskCreatedPayload,
  TaskDeletedPayload,
  TaskUpdatedPayload,
} from '@contracts/tasks';
import type { TaskChangeSet } from '../domain/task-change-set.js';
import type { Task } from '../domain/task.js';

/** Los eventos de integración de una tarea, armados con su estado ya guardado. Utilidad pura. */
export class TaskEvents {
  static created(tenantId: string, task: Task): TaskCreatedPayload {
    const state = task.snapshot();
    return {
      tenantId,
      taskId: state.id,
      status: state.status,
      version: state.version ?? 1,
      createdBy: state.createdBy,
      createdAt: state.createdAt.toISOString(),
    };
  }

  static updated(
    tenantId: string,
    task: Task,
    change: TaskChangeSet,
    actor: UserRef,
  ): TaskUpdatedPayload {
    const state = task.snapshot();
    return {
      tenantId,
      taskId: state.id,
      changedFields: [...change.changedFields],
      statusBefore: change.statusBefore,
      statusAfter: change.statusAfter,
      version: state.version ?? 1,
      actor,
      createdBy: state.createdBy,
      updatedAt: state.updatedAt.toISOString(),
    };
  }

  static deleted(
    tenantId: string,
    task: Task,
    actor: UserRef,
  ): TaskDeletedPayload {
    const state = task.snapshot();
    return {
      tenantId,
      taskId: state.id,
      status: state.status,
      version: state.version ?? 1,
      actor,
      deletedAt: (state.deletedAt ?? state.updatedAt).toISOString(),
    };
  }
}
