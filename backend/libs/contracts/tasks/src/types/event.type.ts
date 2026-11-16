import type { UserRef } from '@contracts/platform';
import type { TaskField, TaskStatus } from '../enums/tasks.enum.js';

/** Se creó una tarea. */
export interface TaskCreatedPayload {
  tenantId: string;
  taskId: string;
  status: TaskStatus;
  version: number;
  createdBy: UserRef;
  createdAt: string;
}

/** Se cambió una tarea. `actor` es quien la cambió y `createdBy` quien la creó. */
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

/** Se borró una tarea (borrado lógico). */
export interface TaskDeletedPayload {
  tenantId: string;
  taskId: string;
  status: TaskStatus;
  version: number;
  actor: UserRef;
  deletedAt: string;
}
