import type { UserRef } from '@contracts/platform';
import type {
  TaskCreatedPayload,
  TaskDeletedPayload,
  TaskUpdatedPayload,
} from '@contracts/tasks';
import type { TaskChangeSet } from '../domain/task-change-set.js';
import type { Task } from '../domain/task.js';

/** A task's integration events, built from its already saved state. Pure utility. */
export class TaskEvents {
  /**
   * Builds the payload of `TaskCreated`.
   * @param tenantId Tenant of the task.
   * @param task Created task.
   * @returns The event payload.
   */
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

  /**
   * Builds the payload of `TaskUpdated` with the changed fields.
   * @param tenantId Tenant of the task.
   * @param task Updated task.
   * @param change Fields that changed.
   * @param actor User who changed it.
   * @returns The event payload.
   */
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

  /**
   * Builds the payload of `TaskDeleted`.
   * @param tenantId Tenant of the task.
   * @param task Deleted task.
   * @param actor User who deleted it.
   * @returns The event payload.
   */
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
