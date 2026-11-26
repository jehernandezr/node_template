import type {
  ListTaskChangesInput,
  Task,
  TaskChangePage,
} from '@contracts/tasks';

/** What the rest of tasks can ask of the tasks module. */
export abstract class TasksFacade {
  /**
   * Reads one current task of the tenant.
   * @param tenantId Tenant that owns the task.
   * @param taskId Task to read.
   * @returns The task.
   * @throws TasksError `TASKS.TASK.NOT_FOUND`.
   */
  abstract get(tenantId: string, taskId: string): Promise<Task>;

  /**
   * Removes the user as author or editor of all tasks; returns the affected tasks.
   * @param userId User to remove.
   * @returns How many tasks changed.
   */
  abstract anonymizeUser(userId: string): Promise<number>;

  /**
   * Lists the task changes of a tenant after a cursor.
   * @param query Tenant, cursor and page size.
   * @returns One page of changes.
   */
  abstract listChanges(query: ListTaskChangesInput): Promise<TaskChangePage>;
}
