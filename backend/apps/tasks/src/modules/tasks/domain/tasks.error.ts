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

  /**
   * The task does not exist in the tenant, or was already deleted.
   * @returns The `TASKS.TASK.NOT_FOUND` error.
   */
  static notFound(): TasksError {
    return new TasksError(TasksErrorCode.TaskNotFound);
  }

  /**
   * The task changed since the client read it.
   * @param expected Version the client sent.
   * @param current Version stored now.
   * @returns The `TASKS.TASK.VERSION_CONFLICT` error.
   */
  static versionConflict(expected: number, current: number): TasksError {
    return new TasksError(TasksErrorCode.TaskVersionConflict, undefined, {
      expectedVersion: expected,
      currentVersion: current,
    });
  }

  /**
   * The search text is shorter than the minimum.
   * @param minimum Minimum length.
   * @returns The `TASKS.SEARCH.QUERY_TOO_SHORT` error.
   */
  static queryTooShort(minimum: number): TasksError {
    return new TasksError(TasksErrorCode.SearchQueryTooShort, undefined, {
      minimum,
    });
  }
}
