import { TaskField, TaskStatus } from '@contracts/tasks';
import type { UserRef } from '@contracts/platform';
import type { TaskChangeSet } from './task-change-set.js';
import type { TaskChanges } from './task-changes.js';
import type { TaskState } from './task-state.js';
import { TasksError } from './tasks.error.js';

/** Alta de una tarea: siempre empieza abierta. */
export interface NewTask {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly createdBy: UserRef;
  readonly now: Date;
}

/** Una tarea de la organización. La dueña es el tenant, no quien la crea. */
export class Task {
  private constructor(private state: TaskState) {}

  static create(task: NewTask): Task {
    return new Task({
      id: task.id,
      title: task.title,
      description: task.description,
      status: TaskStatus.Open,
      createdBy: task.createdBy,
      createdAt: task.now,
      updatedAt: task.now,
    });
  }

  static rehydrate(state: TaskState): Task {
    return new Task(state);
  }

  get id(): string {
    return this.state.id;
  }

  snapshot(): TaskState {
    return this.state;
  }

  /**
   * Aplica los cambios pedidos. Devuelve `undefined` si ningún campo cambia de valor: repetir un cambio no
   * genera otra versión ni otro evento.
   * @throws TasksError `TASKS.TASK.VERSION_CONFLICT` si `expectedVersion` no es la versión actual.
   */
  change(
    changes: TaskChanges,
    expectedVersion: number | undefined,
    now: Date,
  ): TaskChangeSet | undefined {
    const current = this.state.version ?? 0;
    if (expectedVersion !== undefined && expectedVersion !== current) {
      throw TasksError.versionConflict(expectedVersion, current);
    }
    const changedFields = this.changedFields(changes);
    if (changedFields.length === 0) {
      return undefined;
    }
    const statusBefore = this.state.status;
    this.state = {
      ...this.state,
      title: changes.title ?? this.state.title,
      description: changes.description ?? this.state.description,
      status: changes.status ?? this.state.status,
      updatedAt: now,
    };
    return { changedFields, statusBefore, statusAfter: this.state.status };
  }

  delete(now: Date): void {
    this.state = { ...this.state, deletedAt: now, updatedAt: now };
  }

  private changedFields(changes: TaskChanges): TaskField[] {
    const candidates: ReadonlyArray<[TaskField, unknown, unknown]> = [
      [TaskField.Title, changes.title, this.state.title],
      [TaskField.Description, changes.description, this.state.description],
      [TaskField.Status, changes.status, this.state.status],
    ];
    return candidates
      .filter(([, next, current]) => next !== undefined && next !== current)
      .map(([field]) => field);
  }
}
