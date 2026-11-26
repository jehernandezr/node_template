import type { TaskStatus } from '@contracts/tasks';
import type { UserRef } from '@contracts/platform';
import { Task } from '../../domain/task.js';
import { TaskEntity } from './entities/task.entity.js';

/** `tasks` row and `Task` aggregate, in both directions. Pure utility. */
export class TaskMapper {
  /**
   * Rebuilds a task from its row.
   * @param row Stored row.
   * @returns The domain task.
   */
  static toDomain(row: TaskEntity): Task {
    return Task.rehydrate({
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status as TaskStatus,
      createdBy: {
        userId: row.createdBy ?? '',
        homeTenantId: row.createdByHomeTenantId,
      },
      createdAt: row.createdAt ?? new Date(0),
      updatedAt: row.updatedAt ?? new Date(0),
      ...(row.deletedAt === null || row.deletedAt === undefined
        ? {}
        : { deletedAt: row.deletedAt }),
      ...(row.version === undefined ? {} : { version: row.version }),
    });
  }

  /**
   * Turns a task into its row.
   * @param task Domain task.
   * @param tenantId Tenant that owns it.
   * @param editor User who writes it.
   * @returns The row to store.
   */
  static toRow(task: Task, tenantId: string, editor: UserRef): TaskEntity {
    const state = task.snapshot();
    const row = new TaskEntity();
    row.id = state.id;
    row.tenantId = tenantId;
    row.title = state.title;
    row.description = state.description;
    row.status = state.status;
    row.createdBy = state.createdBy.userId;
    row.createdByHomeTenantId = state.createdBy.homeTenantId;
    row.updatedBy = editor.userId;
    row.createdAt = state.createdAt;
    row.updatedAt = state.updatedAt;
    if (state.version !== undefined) {
      row.version = state.version;
    }
    return row;
  }
}
