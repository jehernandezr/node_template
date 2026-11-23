import type { TaskStatus } from '@contracts/tasks';
import type { UserRef } from '@contracts/platform';

/** Estado de una tarea tal como se guarda. `version` falta hasta que la tarea se guarda por primera vez. */
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
