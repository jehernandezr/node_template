import { Injectable } from '@nestjs/common';
import { TaskDeletedEvent } from '@contracts/tasks';
import { Clock, TransactionManager } from '@platform/kernel';
import { MessageBus } from '@platform/messaging';
import { TenantShard } from '../../../shared/utils/tenant-shard.js';
import { TaskRepository } from '../domain/task.repository.js';
import { TaskSearch } from '../domain/task-search.js';
import { TasksError } from '../domain/tasks.error.js';
import type { DeleteTaskCommand } from './task-commands.js';
import { TaskEvents } from './task-events.js';

/** Borrado lógico: la tarea sale de la lista y de la búsqueda, y el job la elimina después. */
@Injectable()
export class DeleteTask {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly search: TaskSearch,
    private readonly bus: MessageBus,
    private readonly shard: TenantShard,
    private readonly transactions: TransactionManager,
    private readonly clock: Clock,
  ) {}

  /** @throws TasksError `TASKS.TASK.NOT_FOUND` si no existe o ya se borró. */
  execute(command: DeleteTaskCommand): Promise<void> {
    return this.shard.run(command.tenantId, () =>
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
