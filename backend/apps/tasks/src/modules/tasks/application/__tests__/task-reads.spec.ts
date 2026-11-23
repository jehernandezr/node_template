import { TaskStatus, TasksErrorCode } from '@contracts/tasks';
import { TasksHarness } from '../../__tests__/utils/index.js';

describe('task reads', () => {
  describe('ListTasks', () => {
    it('pages the tenant tasks from newest to oldest without repeating any', async () => {
      const harness = new TasksHarness();
      const first = await harness.aTask('Primera');
      const second = await harness.aTask('Segunda');
      const third = await harness.aTask('Tercera');

      const page1 = await harness.list.execute(TasksHarness.TENANT, {
        limit: 2,
      });
      const page2 = await harness.list.execute(TasksHarness.TENANT, {
        limit: 2,
        after: page1.nextCursor ?? undefined,
      });

      expect(page1.items.map((task) => task.id)).toEqual([third.id, second.id]);
      expect(page2.items.map((task) => task.id)).toEqual([first.id]);
      expect(page2.nextCursor).toBeNull();
    });

    it('lists only the tasks in the requested status', async () => {
      const harness = new TasksHarness();
      const done = await harness.aTask('Hecha');
      await harness.aTask('Abierta');
      await harness.update.execute({
        tenantId: TasksHarness.TENANT,
        actor: TasksHarness.ANA,
        taskId: done.id,
        changes: { status: TaskStatus.Done },
      });

      const page = await harness.list.execute(TasksHarness.TENANT, {
        status: TaskStatus.Done,
      });

      expect(page.items.map((task) => task.title)).toEqual(['Hecha']);
    });

    it('searches by text and pages the results with a cursor', async () => {
      const harness = new TasksHarness();
      await harness.aTask('Factura de marzo');
      await harness.aTask('Factura de abril');
      await harness.aTask('Regar las plantas');

      const page1 = await harness.list.execute(TasksHarness.TENANT, {
        q: 'factura',
        limit: 1,
      });
      const page2 = await harness.list.execute(TasksHarness.TENANT, {
        q: 'factura',
        limit: 1,
        after: page1.nextCursor ?? undefined,
      });

      expect(
        [...page1.items, ...page2.items].map((task) => task.title).sort(),
      ).toEqual(['Factura de abril', 'Factura de marzo']);
      expect(page2.nextCursor).toBeNull();
    });

    it('rejects a search shorter than the minimum', async () => {
      const harness = new TasksHarness();

      await expect(
        harness.list.execute(TasksHarness.TENANT, { q: ' f ' }),
      ).rejects.toMatchObject({ code: TasksErrorCode.SearchQueryTooShort });
    });

    it('never shows the tasks of another tenant', async () => {
      const harness = new TasksHarness();
      await harness.aTask('Del tenant principal');

      const page = await harness.list.execute(TasksHarness.OTHER_TENANT, {});

      expect(page.items).toEqual([]);
    });
  });

  describe('ListTaskChanges', () => {
    it('includes deleted tasks in the order they changed, page by page', async () => {
      const harness = new TasksHarness();
      const kept = await harness.aTask('Se queda');
      harness.clock.advance(1000);
      const gone = await harness.aTask('Se va');
      harness.clock.advance(1000);
      await harness.remove.execute({
        tenantId: TasksHarness.TENANT,
        actor: TasksHarness.ANA,
        taskId: gone.id,
      });

      const page1 = await harness.changes.execute({
        tenantId: TasksHarness.TENANT,
        limit: 1,
      });
      const page2 = await harness.changes.execute({
        tenantId: TasksHarness.TENANT,
        limit: 1,
        after: page1.nextCursor ?? undefined,
      });

      expect(page1.items).toEqual([
        expect.objectContaining({ id: kept.id, deletedAt: null }),
      ]);
      expect(page2.items).toEqual([
        expect.objectContaining({ id: gone.id, deletedAt: expect.any(String) }),
      ]);
      expect(page2.nextCursor).toBeNull();
    });
  });
});
