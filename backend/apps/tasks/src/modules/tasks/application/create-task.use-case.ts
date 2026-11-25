import { Injectable } from '@nestjs/common';
import { TaskCreatedEvent, type Task as TaskView } from '@contracts/tasks';
import { Clock, IdGenerator, TransactionManager } from '@platform/kernel';
import { MessageBus } from '@platform/messaging';
import { TenantShard } from '../../../shared/utils/tenant-shard.js';
import { TaskRepository } from '../domain/task.repository.js';
import { TaskSearch } from '../domain/task-search.js';
import { Task } from '../domain/task.js';
import type { CreateTaskCommand } from './task-commands.js';
import { TaskEvents } from './task-events.js';
import { TaskViews } from './task-view.js';

/** Creates an open task, indexes it and publishes `tasks.task.created.v1`, all in one transaction. */
@Injectable()
export class CreateTask {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly search: TaskSearch,
    private readonly bus: MessageBus,
    private readonly shard: TenantShard,
    private readonly transactions: TransactionManager,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  execute(command: CreateTaskCommand): Promise<TaskView> {
    return this.shard.run(command.tenantId, () =>
      this.transactions.runInTransaction(async () => {
        const task = await this.tasks.insert(
          Task.create({
            id: this.ids.next().toString(),
            title: command.title,
            description: command.description ?? '',
            createdBy: command.actor,
            now: this.clock.now(),
          }),
        );
        await this.search.index(task);
        await this.bus.publish(
          TaskCreatedEvent,
          TaskEvents.created(command.tenantId, task),
          { tenantId: command.tenantId, groupId: task.id },
        );
        return TaskViews.of(task);
      }),
    );
  }
}
