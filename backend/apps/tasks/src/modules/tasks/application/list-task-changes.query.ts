import { Injectable } from '@nestjs/common';
import type { ListTaskChangesInput, TaskChangePage } from '@contracts/tasks';
import { TasksDefaults } from '../../../shared/constants/tasks-defaults.constants.js';
import { TenantShard } from '../../../shared/utils/tenant-shard.js';
import { TaskRepository } from '../domain/task.repository.js';
import { TaskCursors } from './task-cursors.js';
import { TaskViews } from './task-view.js';

/** A tenant's tasks changed since an instant, deleted ones included, for whoever builds projections. */
@Injectable()
export class ListTaskChanges {
  private readonly cursors = new TaskCursors();

  constructor(
    private readonly tasks: TaskRepository,
    private readonly shard: TenantShard,
  ) {}

  execute(query: ListTaskChangesInput): Promise<TaskChangePage> {
    const limit = query.limit ?? TasksDefaults.pageSize;
    return this.shard.run(query.tenantId, async () => {
      const changes = await this.tasks.changes({
        updatedAfter:
          query.updatedAfter === undefined
            ? undefined
            : new Date(query.updatedAfter),
        after: this.cursors.changeOf(query.after),
        limit: limit + 1,
      });
      const items = changes.slice(0, limit);
      const last = items.at(-1)?.snapshot();
      return {
        items: items.map((task) => TaskViews.change(task)),
        nextCursor:
          changes.length > limit && last !== undefined
            ? this.cursors.afterChange(last.updatedAt, last.id)
            : null,
      };
    });
  }
}
