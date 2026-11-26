import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import type { Task as TaskView } from '@contracts/tasks';
import { TaskRepository } from '../domain/task.repository.js';
import { TasksError } from '../domain/tasks.error.js';
import { TaskViews } from './task-view.js';

/** A current task of the tenant. */
@Injectable()
export class GetTask {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly shard: ShardScopes,
  ) {}

  /**
   * Reads one current task of the tenant.
   * @param tenantId Tenant that owns the task.
   * @param taskId Task to read.
   * @returns The task view.
   * @throws TasksError `TASKS.TASK.NOT_FOUND`.
   */
  execute(tenantId: string, taskId: string): Promise<TaskView> {
    return this.shard.inTenantShard(tenantId, async () => {
      const task = await this.tasks.find(taskId);
      if (task === undefined) {
        throw TasksError.notFound();
      }
      return TaskViews.of(task);
    });
  }
}
