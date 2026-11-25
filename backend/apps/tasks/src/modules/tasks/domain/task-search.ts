import type { TaskStatus } from '@contracts/tasks';
import type { Task } from './task.js';

/** Text search over the tasks of the scope's tenant, from position `offset` of the ranking. */
export interface TaskSearchQuery {
  readonly text: string;
  readonly status?: TaskStatus;
  readonly limit: number;
  readonly offset: number;
}

/**
 * A page of results and, if there are more, the ranking position where the next one continues. With a status
 * filter the page can be short, or empty, even if there are more.
 */
export interface TaskSearchResult {
  readonly tasks: readonly Task[];
  readonly nextOffset?: number;
}

/** Search index of the tasks of the tenant of the open `ShardScope`. */
export abstract class TaskSearch {
  abstract index(task: Task): Promise<void>;

  abstract remove(taskId: string): Promise<void>;

  /** The most relevant current tasks first, only those of the requested status if one is given. */
  abstract search(query: TaskSearchQuery): Promise<TaskSearchResult>;
}
