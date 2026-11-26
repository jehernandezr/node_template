import { TaskField, TaskStatus } from '@contracts/tasks';
import type { UserRef } from '@contracts/platform';
import type { TaskChangeSet } from './task-change-set.js';
import type { TaskChanges } from './task-changes.js';
import type { TaskState } from './task-state.js';
import { TasksError } from './tasks.error.js';

/** Creation of a task: it always starts open. */
export interface NewTask {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly createdBy: UserRef;
  readonly now: Date;
}

/** A task of the organization. The owner is the tenant, not whoever creates it. */
export class Task {
  private constructor(private state: TaskState) {}

  /**
   * Starts a new task in version 1.
   * @param task Id, author, fields and creation instant.
   * @returns The task.
   */
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

  /**
   * Rebuilds a task from its state.
   * @param state Stored task.
   * @returns The task.
   */
  static rehydrate(state: TaskState): Task {
    return new Task(state);
  }

  /** UUIDv7 that identifies the task within its tenant. */
  get id(): string {
    return this.state.id;
  }

  /**
   * Copies the task state to store or show it.
   * @returns The task state.
   */
  snapshot(): TaskState {
    return this.state;
  }

  /**
   * Applies the requested changes. Returns `undefined` if no field changes value: repeating a change does not
   * generate another version or another event.
   * @param changes Fields to change.
   * @param expectedVersion Version the client read; not checked when omitted.
   * @param now Instant of the change.
   * @returns The changed fields, or `undefined`.
   * @throws TasksError `TASKS.TASK.VERSION_CONFLICT` if `expectedVersion` is not the current version.
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

  /**
   * Marks the task deleted.
   * @param now Instant of the deletion.
   */
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
