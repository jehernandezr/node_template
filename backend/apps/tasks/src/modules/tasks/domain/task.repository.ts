import type { UserRef } from '@contracts/platform';
import type { TaskChangesRequest } from './task-changes-request.js';
import type { TaskPageRequest } from './task-page-request.js';
import type { Task } from './task.js';

/** Tasks of the tenant of the open `ShardScope`. */
export abstract class TaskRepository {
  /**
   * The current task, or `undefined` if it does not exist or is deleted.
   * @param taskId Task to read.
   * @returns The task, or `undefined`.
   */
  abstract find(taskId: string): Promise<Task | undefined>;

  /**
   * The current tasks with those ids, in the requested order; those that do not exist are omitted.
   * @param taskIds Tasks to read, in order.
   * @returns The tasks found.
   */
  abstract findMany(taskIds: readonly string[]): Promise<readonly Task[]>;

  /**
   * Inserts the new task and returns its saved state.
   * @param task New task.
   * @returns The stored task.
   */
  abstract insert(task: Task): Promise<Task>;

  /**
   * Saves the changes of a read task and returns its saved state.
   * @param task Task read earlier and changed.
   * @param actor User who changed it.
   * @returns The stored task.
   * @throws OptimisticLockError if another write changed it since it was read.
   */
  abstract update(task: Task, actor: UserRef): Promise<Task>;

  /**
   * Saves the soft delete of a read task and returns its saved state.
   * @param task Task read earlier.
   * @param actor User who deleted it.
   * @returns The stored task.
   * @throws OptimisticLockError if another write changed it since it was read.
   */
  abstract remove(task: Task, actor: UserRef): Promise<Task>;

  /**
   * Reads a page of current tasks, newest first.
   * @param request Status filter, cursor and page size.
   * @returns The tasks of the page.
   */
  abstract page(request: TaskPageRequest): Promise<readonly Task[]>;

  /**
   * Reads the task changes after a cursor, in write order.
   * Includes deleted ones: whoever synchronizes needs to know they no longer exist.
   * @param request Cursor and page size.
   * @returns The changed tasks.
   */
  abstract changes(request: TaskChangesRequest): Promise<readonly Task[]>;
}
