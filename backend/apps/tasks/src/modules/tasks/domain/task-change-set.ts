import type { TaskField, TaskStatus } from '@contracts/tasks';

/** Lo que de verdad cambió en una tarea, para el evento que lo cuenta. */
export interface TaskChangeSet {
  readonly changedFields: readonly TaskField[];
  readonly statusBefore: TaskStatus;
  readonly statusAfter: TaskStatus;
}
