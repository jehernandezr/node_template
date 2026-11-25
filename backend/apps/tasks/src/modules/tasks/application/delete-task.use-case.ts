import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import { TaskDeletedEvent } from '@contracts/tasks';
import { Clock, TransactionManager } from '@platform/kernel';
import { MessageBus } from '@platform/messaging';
import { TaskRepository } from '../domain/task.repository.js';
import { TaskSearch } from '../domain/task-search.js';
import { TasksError } from '../domain/tasks.error.js';
import type { DeleteTaskCommand } from './task-commands.js';
import { TaskEvents } from './task-events.js';

/** Soft delete: the task leaves the list and the search, and the job removes it later. */
@Injectable()
export class DeleteTask {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly search: TaskSearch,
    private readonly bus: MessageBus,
    private readonly shard: ShardScopes,
    private readonly transactions: TransactionManager,
    private readonly clock: Clock,
  ) {}

  /** @throws TasksError `TASKS.TASK.NOT_FOUND` if it does not exist or was already deleted. */
  execute(command: DeleteTaskCommand): Promise<void> {
    return this.shard.inTenantShard(command.tenantId, () =>
      this.transactions.runInTransaction(async () => {
        const task = await this.tasks.find(command.taskId);
        if (task === undefined) {
          throw TasksError.notFound();
        }
        task.delete(this.clock.now());
        const saved = await this.tasks.remove(task, command.actor);
        await this.search.remove(saved.id);
        await this.bus.publish(
          TaskDeletedEvent,
          TaskEvents.deleted(command.tenantId, saved, command.actor),
          { tenantId: command.tenantId, groupId: saved.id },
        );
      }),
    );
  }
}
