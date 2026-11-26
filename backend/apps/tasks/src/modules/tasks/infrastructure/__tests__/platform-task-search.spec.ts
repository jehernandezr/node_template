import { ConsistentHashStrategy } from '@platform/sharding';
import { SystemClock } from '@platform/kernel';
import { TaskStatus } from '@contracts/tasks';
import { SequentialIdGenerator } from '@platform/kernel/test-utils';
import { ShardScope } from '@platform/persistence';
import { ShardKey, ShardRouter } from '@platform/sharding';
import { InMemoryDirectoryStore } from '@platform/sharding/test-utils';
import { Task } from '../../domain/task.js';
import {
  InMemorySearchIndex,
  InMemoryTaskRepository,
  TasksHarness,
} from '../../__tests__/utils/index.js';
import { PlatformTaskSearch } from '../platform-task-search.js';

const NOW = new Date('2026-11-20T10:00:00.000Z');
const PAGE = 2;

const setup = () => {
  const scope = new ShardScope(
    new ShardRouter({
      strategy: new ConsistentHashStrategy(),
      clock: new SystemClock(),
      directory: new InMemoryDirectoryStore(),
    }),
  );
  const index = new InMemorySearchIndex();
  const tasks = new InMemoryTaskRepository(scope);
  const search = new PlatformTaskSearch(index, tasks);
  const ids = new SequentialIdGenerator();
  const inTenant = <T>(fn: () => Promise<T>): Promise<T> =>
    scope.run({ tenantId: TasksHarness.TENANT, keyKind: ShardKey.Tenant }, fn);
  const aTask = (title: string, status: TaskStatus) =>
    inTenant(async () => {
      const task = await tasks.insert(
        Task.rehydrate({
          id: ids.next().toString(),
          title,
          description: '',
          status,
          createdBy: TasksHarness.ANA,
          createdAt: NOW,
          updatedAt: NOW,
        }),
      );
      await search.index(task);
      return task;
    });
  return { index, search, aTask, inTenant };
};

describe('PlatformTaskSearch', () => {
  it('pages the ranking and points the cursor at the first result of the next page', async () => {
    const { search, aTask, inTenant } = setup();
    for (const month of ['enero', 'febrero', 'marzo']) {
      await aTask(`Factura de ${month}`, TaskStatus.Open);
    }

    const page = await inTenant(() =>
      search.search({ text: 'factura', limit: PAGE, offset: 0 }),
    );

    expect(page.tasks.map((task) => task.snapshot().title)).toEqual([
      'Factura de enero',
      'Factura de febrero',
    ]);
    expect(page.nextOffset).toBe(2);
  });

  describe('with a status filter', () => {
    const scanned = PlatformTaskSearch.MAX_BATCHES * (PAGE + 1);

    it('stops after a bounded number of reads and hands back a cursor to keep going', async () => {
      const { index, search, aTask, inTenant } = setup();
      for (let n = 0; n < scanned + 4; n += 1) {
        await aTask(`Factura ${n}`, TaskStatus.Open);
      }
      await aTask('Factura pagada', TaskStatus.Done);

      const page = await inTenant(() =>
        search.search({
          text: 'factura',
          status: TaskStatus.Done,
          limit: PAGE,
          offset: 0,
        }),
      );

      expect(index.reads).toBe(PlatformTaskSearch.MAX_BATCHES);
      expect(page).toEqual({ tasks: [], nextOffset: scanned });
    });

    it('finds the matching tasks further down when the client follows the cursor', async () => {
      const { search, aTask, inTenant } = setup();
      for (let n = 0; n < scanned + 4; n += 1) {
        await aTask(`Factura ${n}`, TaskStatus.Open);
      }
      await aTask('Factura pagada', TaskStatus.Done);

      const first = await inTenant(() =>
        search.search({
          text: 'factura',
          status: TaskStatus.Done,
          limit: PAGE,
          offset: 0,
        }),
      );
      const second = await inTenant(() =>
        search.search({
          text: 'factura',
          status: TaskStatus.Done,
          limit: PAGE,
          offset: first.nextOffset ?? 0,
        }),
      );

      expect(second.tasks.map((task) => task.snapshot().title)).toEqual([
        'Factura pagada',
      ]);
      expect(second.nextOffset).toBeUndefined();
    });
  });
});
