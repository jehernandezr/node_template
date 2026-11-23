import { DomainError } from '@platform/kernel';
import { TasksErrorCode } from '@contracts/tasks';

/** Regla de tasks que no se cumple. El estado HTTP y la audiencia salen del catálogo del contrato. */
export class TasksError extends DomainError {
  constructor(
    readonly code: TasksErrorCode,
    message: string = code,
    details?: Readonly<Record<string, unknown>>,
  ) {
    super(message, details);
  }

  /** La tarea no existe en el tenant, o ya se borró. */
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
