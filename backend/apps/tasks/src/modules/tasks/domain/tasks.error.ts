import { DomainError } from '@platform/kernel';
import { TasksErrorCode } from '@contracts/tasks';

/** A tasks rule that is not met. The HTTP status and the audience come from the contract catalog. */
export class TasksError extends DomainError {
  constructor(
    readonly code: TasksErrorCode,
    message: string = code,
    details?: Readonly<Record<string, unknown>>,
  ) {
    super(message, details);
  }

  /** The task does not exist in the tenant, or was already deleted. */
  static notFound(): TasksError {
    return new TasksError(TasksErrorCode.TaskNotFound);
  }

  static versionConflict(expected: number, current: number): TasksError {
    return new TasksError(TasksErrorCode.TaskVersionConflict, undefined, {
      expectedVersion: expected,
      currentVersion: current,
    });
  }

  static queryTooShort(minimum: number): TasksError {
    return new TasksError(TasksErrorCode.SearchQueryTooShort, undefined, {
      minimum,
    });
  }
}
