import type { TaskStatus } from '@contracts/tasks';

/** A page of tasks of the scope's tenant, from newest to oldest, after `afterId`. */
export interface TaskPageRequest {
  readonly status?: TaskStatus;
  readonly afterId?: string;
  readonly limit: number;
}
