import { Injectable } from '@nestjs/common';
import type { Task as TaskView } from '@contracts/tasks';
import { TenantShard } from '../../../shared/utils/tenant-shard.js';
import { TaskRepository } from '../domain/task.repository.js';
import { TasksError } from '../domain/tasks.error.js';
import { TaskViews } from './task-view.js';

/** Una tarea vigente del tenant. */
@Injectable()
export class GetTask {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly shard: TenantShard,
  ) {}

  /** @throws TasksError `TASKS.TASK.NOT_FOUND`. */
  execute(tenantId: string, taskId: string): Promise<TaskView> {
    return this.shard.run(tenantId, async () => {
      const task = await this.tasks.find(taskId);
      if (task === undefined) {
        throw TasksError.notFound();
      }
      return TaskViews.of(task);
    });
  }
}
