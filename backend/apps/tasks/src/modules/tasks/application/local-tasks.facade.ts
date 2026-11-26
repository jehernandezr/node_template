import { Injectable } from '@nestjs/common';
import type {
  ListTaskChangesInput,
  Task,
  TaskChangePage,
} from '@contracts/tasks';
import { TasksDefaults } from '../../../shared/constants/tasks-defaults.constants.js';
import { TaskMaintenance } from '../domain/task-maintenance.js';
import { GetTask } from './get-task.query.js';
import { ListTaskChanges } from './list-task-changes.query.js';
import { TasksFacade } from './tasks.facade.js';

/** `TasksFacade` for callers in the same process: each method runs the module's use case or repository. */
@Injectable()
export class LocalTasksFacade extends TasksFacade {
  constructor(
    private readonly getTask: GetTask,
    private readonly changes: ListTaskChanges,
    private readonly maintenance: TaskMaintenance,
  ) {
    super();
  }

  override get(tenantId: string, taskId: string): Promise<Task> {
    return this.getTask.execute(tenantId, taskId);
  }

  override anonymizeUser(userId: string): Promise<number> {
    return this.maintenance.replaceAuthor(userId, TasksDefaults.erasedAuthor);
  }

  override listChanges(query: ListTaskChangesInput): Promise<TaskChangePage> {
    return this.changes.execute(query);
  }
}
