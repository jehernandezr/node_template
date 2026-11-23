import type { TaskStatus } from '@contracts/tasks';
import type { UserRef } from '@contracts/platform';
import { Task } from '../../domain/task.js';
import { TaskEntity } from './entities/task.entity.js';

/** Fila de `tasks` y agregado `Task`, en los dos sentidos. Utilidad pura. */
export class TaskMapper {
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
