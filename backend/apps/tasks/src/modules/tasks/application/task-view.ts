import type { Task as TaskView, TaskChange } from '@contracts/tasks';
import type { Task } from '../domain/task.js';

/** How a task goes out through the contract. Pure utility. */
export class TaskViews {
  static of(task: Task): TaskView {
    const state = task.snapshot();
    return {
      id: state.id,
      title: state.title,
      description: state.description,
      status: state.status,
      version: state.version ?? 1,
      createdAt: state.createdAt.toISOString(),
      updatedAt: state.updatedAt.toISOString(),
      createdBy: state.createdBy,
    };
  }

  static change(task: Task): TaskChange {
    return {
      ...TaskViews.of(task),
      deletedAt: task.snapshot().deletedAt?.toISOString() ?? null,
    };
  }
}
