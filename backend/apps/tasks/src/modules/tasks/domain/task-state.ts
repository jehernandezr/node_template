import type { TaskStatus } from '@contracts/tasks';
import type { UserRef } from '@contracts/platform';

/** State of a task as stored. `version` is missing until the task is saved for the first time. */
export interface TaskState {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly status: TaskStatus;
  readonly createdBy: UserRef;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt?: Date;
  readonly version?: number;
}
