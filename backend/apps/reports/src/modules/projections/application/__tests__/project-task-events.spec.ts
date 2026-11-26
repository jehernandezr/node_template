import { TaskField, TaskStatus } from '@contracts/tasks';
import { InMemoryTransactionManager } from '@platform/messaging/test-utils';
import { UnroutedShardScopes } from '@platform/persistence/test-utils';
import { InMemoryTaskProjection } from '../../__tests__/utils/index.js';
import { ProjectTaskEvents } from '../project-task-events.use-case.js';

const TENANT = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01';
const OTHER = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a02';
const TASK = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f01';
const ACTOR = {
  userId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b01',
  homeTenantId: TENANT,
};
const NOVEMBER = { from: '2026-11-01', to: '2026-11-30' };

class TaskEventsHarness {
  private readonly unrouted = new UnroutedShardScopes();
  readonly projection = new InMemoryTaskProjection(this.unrouted.scope);
  readonly events = new ProjectTaskEvents(
    this.projection,
    this.unrouted.scopes,
    new InMemoryTransactionManager(),
  );

  created(version = 1, tenantId = TENANT): Promise<void> {
    return this.events.created({
      tenantId,
      taskId: TASK,
      status: TaskStatus.Open,
      version,
      createdBy: ACTOR,
      createdAt: '2026-11-03T09:00:00.000Z',
    });
  }

  moved(
    from: TaskStatus,
    to: TaskStatus,
    version: number,
    at: string,
  ): Promise<void> {
    return this.events.updated({
      tenantId: TENANT,
      taskId: TASK,
      changedFields: [TaskField.Status],
      statusBefore: from,
      statusAfter: to,
      version,
      actor: ACTOR,
      createdBy: ACTOR,
      updatedAt: at,
    });
  }

  task() {
    return this.projection.tasksOf(TENANT)[0];
  }

  countsOfNovember() {
    return this.unrouted.scopes.inTenantShard(TENANT, () =>
      this.projection.statusCounts(NOVEMBER),
    );
  }
}

describe('ProjectTaskEvents', () => {
  it('projects a created task with its status and creation date', async () => {
    const harness = new TaskEventsHarness();

    await harness.created();

    expect(harness.task()).toMatchObject({
      status: TaskStatus.Open,
      version: 1,
      createdAt: new Date('2026-11-03T09:00:00.000Z'),
    });
    await expect(
      harness.events.created({
        tenantId: OTHER,
        taskId: TASK,
        status: TaskStatus.Open,
        version: 1,
        createdBy: ACTOR,
        createdAt: '2026-11-03T09:00:00.000Z',
      }),
    ).resolves.toBeUndefined();
    expect(harness.projection.tasksOf(OTHER)).toHaveLength(1);
    expect(harness.projection.tasksOf(TENANT)).toHaveLength(1);
  });

  it('dates the completion when the task moves into done, and not again when it changes while done', async () => {
    const harness = new TaskEventsHarness();
    await harness.created();

    await harness.moved(
      TaskStatus.Open,
      TaskStatus.Done,
      2,
      '2026-11-05T10:00:00.000Z',
    );
    await harness.moved(
      TaskStatus.Done,
      TaskStatus.Done,
      3,
      '2026-11-09T10:00:00.000Z',
    );

    expect(harness.task()).toMatchObject({
      status: TaskStatus.Done,
      doneAt: new Date('2026-11-05T10:00:00.000Z'),
    });
  });

  it('clears the completion of a task that is reopened', async () => {
    const harness = new TaskEventsHarness();
    await harness.created();
    await harness.moved(
      TaskStatus.Open,
      TaskStatus.Done,
      2,
      '2026-11-05T10:00:00.000Z',
    );

    await harness.moved(
      TaskStatus.Done,
      TaskStatus.InProgress,
      3,
      '2026-11-06T10:00:00.000Z',
    );

    expect(harness.task()).toMatchObject({ status: TaskStatus.InProgress });
    expect(harness.task()?.doneAt).toBeUndefined();
  });

  it('keeps the newest version when events arrive out of order', async () => {
    const harness = new TaskEventsHarness();
    await harness.moved(
      TaskStatus.Open,
      TaskStatus.Done,
      2,
      '2026-11-05T10:00:00.000Z',
    );

    await harness.created(1);

    expect(harness.task()).toMatchObject({
      status: TaskStatus.Done,
      version: 2,
      createdAt: new Date('2026-11-03T09:00:00.000Z'),
    });
  });

  it('counts the live tasks of the period by status', async () => {
    const harness = new TaskEventsHarness();

    await harness.created();

    await expect(harness.countsOfNovember()).resolves.toEqual([
      { status: TaskStatus.Open, count: 1 },
    ]);
  });

  it('leaves a deleted task out of the counts of its period', async () => {
    const harness = new TaskEventsHarness();
    await harness.created();

    await harness.events.deleted({
      tenantId: TENANT,
      taskId: TASK,
      status: TaskStatus.Open,
      version: 2,
      actor: ACTOR,
      deletedAt: '2026-11-04T10:00:00.000Z',
    });

    await expect(harness.countsOfNovember()).resolves.toEqual([]);
  });
});
