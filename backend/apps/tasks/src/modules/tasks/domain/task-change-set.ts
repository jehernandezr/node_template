import type { TaskField, TaskStatus } from '@contracts/tasks';

/** What actually changed in a task, for the event that reports it. */
export interface TaskChangeSet {
  readonly changedFields: readonly TaskField[];
  readonly statusBefore: TaskStatus;
  readonly statusAfter: TaskStatus;
}
