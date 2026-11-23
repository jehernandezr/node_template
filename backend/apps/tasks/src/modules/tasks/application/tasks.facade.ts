import type {
  ListTaskChangesInput,
  Task,
  TaskChangePage,
} from '@contracts/tasks';

/** Lo que el resto de tasks puede pedirle al módulo de tareas. */
export abstract class TasksFacade {
  /** @throws TasksError `TASKS.TASK.NOT_FOUND`. */
  abstract get(tenantId: string, taskId: string): Promise<Task>;

  /** Quita al usuario como autor o editor de todas las tareas; devuelve las tareas tocadas. */
  abstract anonymizeUser(userId: string): Promise<number>;

  abstract listChanges(query: ListTaskChangesInput): Promise<TaskChangePage>;
}
