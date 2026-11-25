import type { UserRef } from '@contracts/platform';
import type { TaskField, TaskStatus } from '../enums/tasks.enum.js';

/** A task was created. */
export interface TaskCreatedPayload {
  tenantId: string;
  taskId: string;
  status: TaskStatus;
  version: number;
  createdBy: UserRef;
  createdAt: string;
}

/** A task was changed. `actor` is who changed it and `createdBy` who created it. */
export interface TaskUpdatedPayload {
  tenantId: string;
  taskId: string;
  changedFields: TaskField[];
  statusBefore: TaskStatus;
  statusAfter: TaskStatus;
  version: number;
  actor: UserRef;
  createdBy: UserRef;
  updatedAt: string;
}

/** A task was deleted (soft delete). */
export interface TaskDeletedPayload {
  tenantId: string;
  taskId: string;
  status: TaskStatus;
  version: number;
  actor: UserRef;
  deletedAt: string;
}
