import type { Page, UserRef } from '@contracts/platform';
import type { TaskStatus } from '../enums/tasks.enum.js';

/** Task of the organization. Its owner is the tenant, not whoever creates it. */
export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  /** Version for optimistic concurrency control: increases on every change. */
  version: number;
  createdAt: string;
  updatedAt: string;
  /** User who created the task. */
  createdBy: UserRef;
}

export type TaskPage = Page<Task>;

/** Listing and search of tasks in the active tenant. */
export interface ListTasksRequest {
  status?: TaskStatus;
  q?: string;
  limit?: number;
  after?: string;
}

/** Read of a task by its id. */
export interface GetTaskRequest {
  taskId: string;
}

/** Creation of a task in the active tenant. */
export interface CreateTaskRequest {
  title: string;
  description?: string;
}

/** Partial changes to a task. `expectedVersion` avoids overwriting someone else's change. */
export interface UpdateTaskRequest {
  taskId: string;
  title?: string;
  description?: string;
  status?: TaskStatus;
  expectedVersion?: number;
}

/** Soft delete of a task. */
export interface DeleteTaskRequest {
  taskId: string;
}

/** Task as the change sync sees it, with the deletion date if there was one. */
export interface TaskChange extends Task {
  deletedAt: string | null;
}

export type TaskChangePage = Page<TaskChange>;

/** Input of the operation that paginates the task changes of a tenant. */
export interface ListTaskChangesInput {
  tenantId: string;
  updatedAfter?: string;
  limit?: number;
  after?: string;
}

/** Input of the operation that anonymizes the user in the tasks. */
export interface EraseTasksUserInput {
  user: UserRef;
}

/** Result of anonymizing the user in the tasks. */
export interface EraseTasksUserResult {
  userId: string;
  affectedRows: number;
}
