import type { TaskStatus } from '@contracts/tasks';

/** Una página de tareas del tenant del scope, de la más nueva a la más antigua, después de `afterId`. */
export interface TaskPageRequest {
  readonly status?: TaskStatus;
  readonly afterId?: string;
  readonly limit: number;
}
