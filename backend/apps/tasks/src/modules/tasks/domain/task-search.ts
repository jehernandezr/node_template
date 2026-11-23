import type { TaskStatus } from '@contracts/tasks';
import type { Task } from './task.js';

/** Búsqueda de texto en las tareas del tenant del scope, desde la posición `offset` del ranking. */
export interface TaskSearchQuery {
  readonly text: string;
  readonly status?: TaskStatus;
  readonly limit: number;
  readonly offset: number;
}

/**
 * Una página de resultados y, si hay más, la posición del ranking donde sigue la siguiente. Con filtro de
 * estado la página puede quedar corta, o vacía, aunque haya más.
 */
export interface TaskSearchResult {
  readonly tasks: readonly Task[];
  readonly nextOffset?: number;
}

/** Índice de búsqueda de las tareas del tenant del `ShardScope` abierto. */
export abstract class TaskSearch {
  abstract index(task: Task): Promise<void>;

  abstract remove(taskId: string): Promise<void>;

  /** Las tareas vigentes más relevantes primero, solo las del estado pedido si llega uno. */
  abstract search(query: TaskSearchQuery): Promise<TaskSearchResult>;
}
