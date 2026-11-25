import { Injectable } from '@nestjs/common';
import {
  TasksLimits,
  type ListTasksRequest,
  type TaskPage,
} from '@contracts/tasks';
import { TasksDefaults } from '../../../shared/constants/tasks-defaults.constants.js';
import { TenantShard } from '../../../shared/utils/tenant-shard.js';
import { TaskRepository } from '../domain/task.repository.js';
import { TaskSearch } from '../domain/task-search.js';
import { TasksError } from '../domain/tasks.error.js';
import type { Task } from '../domain/task.js';
import { TaskCursors } from './task-cursors.js';
import { TaskViews } from './task-view.js';

/** Lists the tenant's tasks, from newest to oldest, or searches them by text if `q` is present. */
@Injectable()
export class ListTasks {
  private readonly cursors = new TaskCursors();

  constructor(
    private readonly tasks: TaskRepository,
    private readonly search: TaskSearch,
    private readonly shard: TenantShard,
  ) {}

  /** @throws TasksError `TASKS.SEARCH.QUERY_TOO_SHORT` if `q` does not reach the minimum. */
  execute(tenantId: string, request: ListTasksRequest): Promise<TaskPage> {
    const limit = request.limit ?? TasksDefaults.pageSize;
    return this.shard.run(tenantId, () =>
      request.q === undefined
        ? this.list(request, limit)
        : this.find(request.q, request, limit),
    );
  }

  private async list(
    request: ListTasksRequest,
    limit: number,
  ): Promise<TaskPage> {
    const page = await this.tasks.page({
      status: request.status,
      afterId: this.cursors.taskOf(request.after),
      limit: limit + 1,
    });
    return this.pageOf(page, limit);
  }

  private async find(
    text: string,
    request: ListTasksRequest,
    limit: number,
  ): Promise<TaskPage> {
    if (text.trim().length < TasksLimits.searchQueryMin) {
      throw TasksError.queryTooShort(TasksLimits.searchQueryMin);
    }
    const result = await this.search.search({
      text,
      status: request.status,
      limit,
      offset: this.cursors.positionOf(request.after),
    });
    return {
      items: result.tasks.map((task) => TaskViews.of(task)),
      nextCursor:
        result.nextOffset === undefined
          ? null
          : this.cursors.afterPosition(result.nextOffset),
    };
  }

  /** One extra task is requested: if it arrives, there is a next page. */
  private pageOf(tasks: readonly Task[], limit: number): TaskPage {
    const items = tasks.slice(0, limit);
    const last = items.at(-1);
    return {
      items: items.map((task) => TaskViews.of(task)),
      nextCursor:
        tasks.length > limit && last !== undefined
          ? this.cursors.afterTask(last.id)
          : null,
    };
  }
}
