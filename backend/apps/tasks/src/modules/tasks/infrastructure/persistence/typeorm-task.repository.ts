import { Injectable } from '@nestjs/common';
import type { UserRef } from '@contracts/platform';
import {
  OptimisticLockError,
  RepositoryKit,
  TenantIsolatedRepository,
} from '@platform/persistence';
import { In, IsNull, type EntityManager } from 'typeorm';
import type { TaskChangesRequest } from '../../domain/task-changes-request.js';
import type { TaskPageRequest } from '../../domain/task-page-request.js';
import { TaskRepository } from '../../domain/task.repository.js';
import type { Task } from '../../domain/task.js';
import { TaskEntity } from './entities/task.entity.js';
import { TaskMapper } from './task.mapper.js';

/** `TaskRepository` sobre `tasks` del shard del tenant. */
@Injectable()
export class TypeOrmTaskRepository
  extends TenantIsolatedRepository
  implements TaskRepository
{
  constructor(kit: RepositoryKit) {
    super(kit);
  }

  async find(taskId: string): Promise<Task | undefined> {
    const tenantId = this.tenantId();
    const row = await this.readPrimary((manager) =>
      manager.findOneBy(TaskEntity, { id: taskId, tenantId }),
    );
    return row === null ? undefined : TaskMapper.toDomain(row);
  }

  async findMany(taskIds: readonly string[]): Promise<readonly Task[]> {
    const tenantId = this.tenantId();
    const rows = await this.read((manager) =>
      manager.findBy(TaskEntity, { id: In([...taskIds]), tenantId }),
    );
    const byId = new Map(rows.map((row) => [row.id, row]));
    return taskIds
      .map((id) => byId.get(id))
      .filter((row): row is TaskEntity => row !== undefined)
      .map((row) => TaskMapper.toDomain(row));
  }

  async insert(task: Task): Promise<Task> {
    const tenantId = this.tenantId();
    const row = TaskMapper.toRow(task, tenantId, task.snapshot().createdBy);
    return this.write(async (manager) => {
      await manager.insert(TaskEntity, row);
      return this.reload(manager, row.id, tenantId);
    });
  }

  async update(task: Task, actor: UserRef): Promise<Task> {
    const tenantId = this.tenantId();
    const row = TaskMapper.toRow(task, tenantId, actor);
    return this.write(async (manager) => {
      await this.kit.writer.update(manager, TaskEntity, row, { tenantId });
      return this.reload(manager, row.id, tenantId);
    });
  }

  async remove(task: Task, actor: UserRef): Promise<Task> {
    const tenantId = this.tenantId();
    const state = task.snapshot();
    return this.write(async (manager) => {
      const result = await manager
        .createQueryBuilder()
        .update(TaskEntity)
        .set({ deletedAt: state.deletedAt, updatedBy: actor.userId })
        .where({
          id: state.id,
          tenantId,
          version: state.version,
          deletedAt: IsNull(),
        })
        .execute();
      if (!result.affected) {
        throw new OptimisticLockError('tasks', state.version ?? 0);
      }
      return this.reload(manager, state.id, tenantId, true);
    });
  }

  async page(request: TaskPageRequest): Promise<readonly Task[]> {
    const tenantId = this.tenantId();
    const rows = await this.read((manager) => {
      const query = manager
        .createQueryBuilder(TaskEntity, 'task')
        .where('task.tenantId = :tenantId', { tenantId })
        .orderBy('task.id', 'DESC')
        .take(request.limit);
      if (request.status !== undefined) {
        query.andWhere('task.status = :status', { status: request.status });
      }
      if (request.afterId !== undefined) {
        query.andWhere('task.id < :afterId', { afterId: request.afterId });
      }
      return query.getMany();
    });
    return rows.map((row) => TaskMapper.toDomain(row));
  }

  async changes(request: TaskChangesRequest): Promise<readonly Task[]> {
    const tenantId = this.tenantId();
    const rows = await this.read((manager) => {
      const query = manager
        .createQueryBuilder(TaskEntity, 'task')
        .withDeleted()
        .where('task.tenantId = :tenantId', { tenantId })
        .orderBy('task.updatedAt', 'ASC')
        .addOrderBy('task.id', 'ASC')
        .take(request.limit);
      if (request.updatedAfter !== undefined) {
        query.andWhere('task.updatedAt > :updatedAfter', {
          updatedAfter: request.updatedAfter,
        });
      }
      if (request.after !== undefined) {
        query.andWhere(
          '(task.updatedAt, task.id) > (:afterUpdatedAt, :afterId)',
          {
            afterUpdatedAt: request.after.updatedAt,
            afterId: request.after.id,
          },
        );
      }
      return query.getMany();
    });
    return rows.map((row) => TaskMapper.toDomain(row));
  }

  private async reload(
    manager: EntityManager,
    id: string,
    tenantId: string,
    withDeleted = false,
  ): Promise<Task> {
    const row = await manager.findOneOrFail(TaskEntity, {
      where: { id, tenantId },
      withDeleted,
    });
    return TaskMapper.toDomain(row);
  }
}
