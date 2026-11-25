import type { TaskStatus } from '@contracts/tasks';

/** Fields someone asks to change; absent ones stay as they are. */
export interface TaskChanges {
  readonly title?: string;
  readonly description?: string;
  readonly status?: TaskStatus;
}
