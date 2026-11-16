import type { Page, UserRef } from '@contracts/platform';
import type { TaskStatus } from '../enums/tasks.enum.js';

/** Tarea de la organización. Su dueña es el tenant, no quien la crea. */
export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  /** Versión para control de concurrencia optimista: sube en cada cambio. */
  version: number;
  createdAt: string;
  updatedAt: string;
  /** Usuario que creó la tarea. */
  createdBy: UserRef;
}

export type TaskPage = Page<Task>;

/** Listado y búsqueda de tareas del tenant activo. */
export interface ListTasksRequest {
  status?: TaskStatus;
  q?: string;
  limit?: number;
  after?: string;
}

/** Lectura de una tarea por su id. */
export interface GetTaskRequest {
  taskId: string;
}

/** Alta de una tarea en el tenant activo. */
export interface CreateTaskRequest {
  title: string;
  description?: string;
}

/** Cambios parciales de una tarea. `expectedVersion` evita pisar un cambio ajeno. */
export interface UpdateTaskRequest {
  taskId: string;
  title?: string;
  description?: string;
  status?: TaskStatus;
  expectedVersion?: number;
}

/** Borrado lógico de una tarea. */
export interface DeleteTaskRequest {
  taskId: string;
}

/** Tarea tal como la ve la sincronización de cambios, con la fecha de borrado si la hubo. */
export interface TaskChange extends Task {
  deletedAt: string | null;
}

export type TaskChangePage = Page<TaskChange>;

/** Entrada de la operación que pagina los cambios de tareas de un tenant. */
export interface ListTaskChangesInput {
  tenantId: string;
  updatedAfter?: string;
  limit?: number;
  after?: string;
}

/** Entrada de la operación que anonimiza al usuario en las tareas. */
export interface EraseTasksUserInput {
  user: UserRef;
}

/** Resultado de anonimizar al usuario en las tareas. */
export interface EraseTasksUserResult {
  userId: string;
  affectedRows: number;
}
