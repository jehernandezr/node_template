import type { UserRef } from '@contracts/platform';
import type { TaskChanges } from '../domain/task-changes.js';

/** Alta de una tarea en un tenant por un usuario. */
export interface CreateTaskCommand {
  readonly tenantId: string;
  readonly actor: UserRef;
  readonly title: string;
  readonly description?: string;
}

/** Cambio de una tarea, con la versión que el cliente leyó si quiere evitar pisar otro cambio. */
export interface UpdateTaskCommand {
  readonly tenantId: string;
  readonly actor: UserRef;
  readonly taskId: string;
  readonly changes: TaskChanges;
  readonly expectedVersion?: number;
}

/** Borrado lógico de una tarea. */
export interface DeleteTaskCommand {
  readonly tenantId: string;
  readonly actor: UserRef;
  readonly taskId: string;
}
