import { TaskStatus } from '@contracts/tasks';
import type { ActivityPoint, StatusCount } from './projection-points.js';
import type { BucketedRange, ReportRange } from './report-range.js';

/**
 * Un cambio de una tarea con la versión que la produjo. Los campos que el mensaje no trae quedan sin valor y
 * no borran lo que ya se sabía.
 */
export interface TaskProjectionChange {
  readonly taskId: string;
  readonly version: number;
  readonly status: TaskStatus;
  /** Si el estado cuenta como completada: solo entonces la tarea conserva su fecha de cierre. */
  readonly done: boolean;
  readonly createdAt?: Date;
  readonly doneAt?: Date;
  readonly removedAt?: Date;
}

/** Qué estado cuenta como una tarea completada en los reportes. Utilidad pura. */
export class TaskCompletion {
  static isDone(status: TaskStatus): boolean {
    return status === TaskStatus.Done;
  }
}

/** Proyección de las tareas del tenant del `ShardScope` abierto. */
export abstract class TaskProjection {
  /** Aplica el cambio sin retroceder: un mensaje viejo que llega tarde no pisa una versión más nueva. */
  abstract apply(change: TaskProjectionChange): Promise<void>;
  abstract statusCounts(range: ReportRange): Promise<readonly StatusCount[]>;
  abstract activity(range: BucketedRange): Promise<readonly ActivityPoint[]>;
}
