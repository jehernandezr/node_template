import type {
  ListTaskChangesInput,
  Task,
  TaskChangePage,
} from '@contracts/tasks';

/** What the rest of tasks can ask of the tasks module. */
export abstract class TasksFacade {
  /** @throws TasksError `TASKS.TASK.NOT_FOUND`. */
  abstract get(tenantId: string, taskId: string): Promise<Task>;

  /** Removes the user as author or editor of all tasks; returns the affected tasks. */
  abstract anonymizeUser(userId: string): Promise<number>;

  abstract listChanges(query: ListTaskChangesInput): Promise<TaskChangePage>;
}
