import type { UserRef } from '@contracts/platform';
import type { TaskChanges } from '../domain/task-changes.js';

/** Creation of a task in a tenant by a user. */
export interface CreateTaskCommand {
  readonly tenantId: string;
  readonly actor: UserRef;
  readonly title: string;
  readonly description?: string;
}

/** Change to a task, with the version the client read if it wants to avoid overwriting another change. */
export interface UpdateTaskCommand {
  readonly tenantId: string;
  readonly actor: UserRef;
  readonly taskId: string;
  readonly changes: TaskChanges;
  readonly expectedVersion?: number;
}

/** Soft delete of a task. */
export interface DeleteTaskCommand {
  readonly tenantId: string;
  readonly actor: UserRef;
  readonly taskId: string;
}
