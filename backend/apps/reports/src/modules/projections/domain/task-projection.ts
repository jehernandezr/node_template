import { TaskStatus } from '@contracts/tasks';
import type { ActivityPoint, StatusCount } from './projection-points.js';
import type { BucketedRange, ReportRange } from './report-range.js';

/**
 * A change to a task with the version that produced it. Fields the message does not carry stay without a value and
 * do not erase what was already known.
 */
export interface TaskProjectionChange {
  readonly taskId: string;
  readonly version: number;
  readonly status: TaskStatus;
  /** Whether the status counts as completed: only then does the task keep its closing date. */
  readonly done: boolean;
  readonly createdAt?: Date;
  readonly doneAt?: Date;
  readonly removedAt?: Date;
}

/** Which status counts as a completed task in the reports. Pure utility. */
export class TaskCompletion {
  static isDone(status: TaskStatus): boolean {
    return status === TaskStatus.Done;
  }
}

/** Projection of the tasks of the tenant of the open `ShardScope`. */
export abstract class TaskProjection {
  /** Applies the change without going backwards: an old message that arrives late does not overwrite a newer version. */
  abstract apply(change: TaskProjectionChange): Promise<void>;
  abstract statusCounts(range: ReportRange): Promise<readonly StatusCount[]>;
  abstract activity(range: BucketedRange): Promise<readonly ActivityPoint[]>;
}
