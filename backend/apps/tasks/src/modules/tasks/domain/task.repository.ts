import type { UserRef } from '@contracts/platform';
import type { TaskChangesRequest } from './task-changes-request.js';
import type { TaskPageRequest } from './task-page-request.js';
import type { Task } from './task.js';

/** Tasks of the tenant of the open `ShardScope`. */
export abstract class TaskRepository {
  /** The current task, or `undefined` if it does not exist or is deleted. */
  abstract find(taskId: string): Promise<Task | undefined>;

  /** The current tasks with those ids, in the requested order; those that do not exist are omitted. */
  abstract findMany(taskIds: readonly string[]): Promise<readonly Task[]>;

  /** Inserts the new task and returns its saved state. */
  abstract insert(task: Task): Promise<Task>;

  /**
   * Saves the changes of a read task and returns its saved state.
   * @throws OptimisticLockError if another write changed it since it was read.
   */
  abstract update(task: Task, actor: UserRef): Promise<Task>;

  /**
   * Saves the soft delete of a read task and returns its saved state.
   * @throws OptimisticLockError if another write changed it since it was read.
   */
  abstract remove(task: Task, actor: UserRef): Promise<Task>;

  abstract page(request: TaskPageRequest): Promise<readonly Task[]>;

  /** Includes deleted ones: whoever synchronizes needs to know they no longer exist. */
  abstract changes(request: TaskChangesRequest): Promise<readonly Task[]>;
}
