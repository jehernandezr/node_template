import { Injectable } from '@nestjs/common';
import { TaskUpdatedEvent, type Task as TaskView } from '@contracts/tasks';
import { Clock, TransactionManager } from '@platform/kernel';
import { MessageBus } from '@platform/messaging';
import { TenantShard } from '../../../shared/utils/tenant-shard.js';
import { TaskRepository } from '../domain/task.repository.js';
import { TaskSearch } from '../domain/task-search.js';
import { TasksError } from '../domain/tasks.error.js';
import type { UpdateTaskCommand } from './task-commands.js';
import { TaskEvents } from './task-events.js';
import { TaskViews } from './task-view.js';

/**
 * Cambia una tarea. Un pedido que no cambia ningún valor devuelve la tarea tal cual, sin versión nueva ni
 * evento, así un reintento del cliente es inocuo.
 */
@Injectable()
export class UpdateTask {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly search: TaskSearch,
    private readonly bus: MessageBus,
    private readonly shard: TenantShard,
    private readonly transactions: TransactionManager,
    private readonly clock: Clock,
  ) {}

  /**
   * @throws TasksError `TASKS.TASK.NOT_FOUND` o `TASKS.TASK.VERSION_CONFLICT`.
   */
  execute(command: UpdateTaskCommand): Promise<TaskView> {
    return this.shard.run(command.tenantId, () =>
      this.transactions.runInTransaction(async () => {
        const task = await this.tasks.find(command.taskId);
        if (task === undefined) {
          throw TasksError.notFound();
        }
        const change = task.change(
          command.changes,
          command.expectedVersion,
          this.clock.now(),
        );
        if (change === undefined) {
          return TaskViews.of(task);
        }
        const saved = await this.tasks.update(task, command.actor);
        await this.search.index(saved);
        await this.bus.publish(
          TaskUpdatedEvent,
          TaskEvents.updated(command.tenantId, saved, change, command.actor),
          { tenantId: command.tenantId, groupId: saved.id },
        );
        return TaskViews.of(saved);
      }),
    );
  }
}
