import { OptimisticLockError, type ShardScope } from '@platform/persistence';
import type { TaskChangesRequest } from '../../domain/task-changes-request.js';
import type { TaskPageRequest } from '../../domain/task-page-request.js';
import { TaskRepository } from '../../domain/task.repository.js';
import { Task } from '../../domain/task.js';
import type { TaskState } from '../../domain/task-state.js';

/** In-memory tasks separated by the `ShardScope` tenant, with optimistic versioning like the database. */
export class InMemoryTaskRepository extends TaskRepository {
  private readonly rows = new Map<string, TaskState & { tenantId: string }>();

  constructor(private readonly scope: ShardScope) {
    super();
  }

  async find(taskId: string): Promise<Task | undefined> {
    const row = this.visible(taskId);
    return row === undefined || row.deletedAt !== undefined
      ? undefined
      : Task.rehydrate(row);
  }

  async findMany(taskIds: readonly string[]): Promise<readonly Task[]> {
    const found = await Promise.all(taskIds.map((id) => this.find(id)));
    return found.filter((task): task is Task => task !== undefined);
  }

  async insert(task: Task): Promise<Task> {
    const state = { ...task.snapshot(), version: 1, tenantId: this.tenant() };
    this.rows.set(state.id, state);
    return Task.rehydrate(state);
  }

  async update(task: Task): Promise<Task> {
    return this.bump(task);
  }

  async remove(task: Task): Promise<Task> {
    return this.bump(task);
  }

  async page(request: TaskPageRequest): Promise<readonly Task[]> {
    return this.ofTenant()
      .filter((row) => row.deletedAt === undefined)
      .filter(
        (row) => request.status === undefined || row.status === request.status,
      )
      .filter(
        (row) => request.afterId === undefined || row.id < request.afterId,
      )
      .sort((a, b) => b.id.localeCompare(a.id))
      .slice(0, request.limit)
      .map((row) => Task.rehydrate(row));
  }

  async changes(request: TaskChangesRequest): Promise<readonly Task[]> {
    const key = (row: TaskState): string =>
      `${row.updatedAt.toISOString()}|${row.id}`;
    const after =
      request.after === undefined
        ? ''
        : `${request.after.updatedAt.toISOString()}|${request.after.id}`;
    return this.ofTenant()
      .filter(
        (row) =>
          request.updatedAfter === undefined ||
          row.updatedAt > request.updatedAfter,
      )
      .filter((row) => key(row) > after)
      .sort((a, b) => key(a).localeCompare(key(b)))
      .slice(0, request.limit)
      .map((row) => Task.rehydrate(row));
  }

  private bump(task: Task): Task {
    const state = task.snapshot();
    const stored = this.visible(state.id);
    if (stored === undefined || stored.version !== state.version) {
      throw new OptimisticLockError('tasks', state.version ?? 0);
    }
    const next = {
      ...state,
      version: (state.version ?? 0) + 1,
      tenantId: stored.tenantId,
    };
    this.rows.set(state.id, next);
    return Task.rehydrate(next);
  }

  private visible(
    taskId: string,
  ): (TaskState & { tenantId: string }) | undefined {
    const row = this.rows.get(taskId);
    return row?.tenantId === this.tenant() ? row : undefined;
  }

  private ofTenant(): Array<TaskState & { tenantId: string }> {
    return [...this.rows.values()].filter(
      (row) => row.tenantId === this.tenant(),
    );
  }

  private tenant(): string {
    const tenantId = this.scope.current()?.tenantId;
    if (tenantId === undefined) {
      throw new Error('a tenant ShardScope is required');
    }
    return tenantId;
  }
}
