import {
  TaskField,
  TaskStatus,
  TasksErrorCode,
  TasksEvent,
} from '@contracts/tasks';
import { TasksHarness } from '../../__tests__/utils/index.js';

describe('task writes', () => {
  describe('CreateTask', () => {
    it('saves an open task, indexes it and publishes its creation in the same transaction', async () => {
      const harness = new TasksHarness();

      const task = await harness.aTask('Send the invoice', 'For March');

      expect(task).toMatchObject({
        title: 'Send the invoice',
        status: TaskStatus.Open,
        version: 1,
        createdBy: TasksHarness.ANA,
      });
      expect(harness.search.indexed()).toEqual([task.id]);
      expect(harness.bus.messages).toEqual([
        {
          type: TasksEvent.TaskCreated,
          tenantId: TasksHarness.TENANT,
          data: expect.objectContaining({
            taskId: task.id,
            createdBy: TasksHarness.ANA,
            version: 1,
          }),
        },
      ]);
    });
  });

  describe('UpdateTask', () => {
    it('publishes who changed what, the status transition and the author to notify', async () => {
      const harness = new TasksHarness();
      const task = await harness.aTask();

      const updated = await harness.update.execute({
        tenantId: TasksHarness.TENANT,
        actor: TasksHarness.BEA,
        taskId: task.id,
        changes: { status: TaskStatus.Done },
        expectedVersion: 1,
      });

      expect(updated).toMatchObject({ status: TaskStatus.Done, version: 2 });
      expect(harness.bus.messages.at(-1)).toEqual({
        type: TasksEvent.TaskUpdated,
        tenantId: TasksHarness.TENANT,
        data: expect.objectContaining({
          changedFields: [TaskField.Status],
          statusBefore: TaskStatus.Open,
          statusAfter: TaskStatus.Done,
          actor: TasksHarness.BEA,
          createdBy: TasksHarness.ANA,
          version: 2,
        }),
      });
    });

    it('leaves a task untouched and publishes nothing when the values are the same', async () => {
      const harness = new TasksHarness();
      const task = await harness.aTask('Igual');

      const same = await harness.update.execute({
        tenantId: TasksHarness.TENANT,
        actor: TasksHarness.ANA,
        taskId: task.id,
        changes: { title: 'Igual' },
      });

      expect(same.version).toBe(1);
      expect(harness.bus.types()).toEqual([TasksEvent.TaskCreated]);
    });

    it('rejects a change when the client read an older version', async () => {
      const harness = new TasksHarness();
      const task = await harness.aTask();

      await expect(
        harness.update.execute({
          tenantId: TasksHarness.TENANT,
          actor: TasksHarness.ANA,
          taskId: task.id,
          changes: { title: 'Other' },
          expectedVersion: 7,
        }),
      ).rejects.toMatchObject({ code: TasksErrorCode.TaskVersionConflict });
    });

    it('does not find a task of another tenant', async () => {
      const harness = new TasksHarness();
      const task = await harness.aTask();

      await expect(
        harness.update.execute({
          tenantId: TasksHarness.OTHER_TENANT,
          actor: TasksHarness.ANA,
          taskId: task.id,
          changes: { title: 'Other' },
        }),
      ).rejects.toMatchObject({ code: TasksErrorCode.TaskNotFound });
    });
  });

  describe('DeleteTask', () => {
    it('hides the task, drops it from the search and publishes the deletion', async () => {
      const harness = new TasksHarness();
      const task = await harness.aTask();

      await harness.remove.execute({
        tenantId: TasksHarness.TENANT,
        actor: TasksHarness.BEA,
        taskId: task.id,
      });

      await expect(
        harness.get.execute(TasksHarness.TENANT, task.id),
      ).rejects.toMatchObject({ code: TasksErrorCode.TaskNotFound });
      expect(harness.search.indexed()).toEqual([]);
      expect(harness.bus.messages.at(-1)).toMatchObject({
        type: TasksEvent.TaskDeleted,
        data: { taskId: task.id, actor: TasksHarness.BEA },
      });
    });

    it('refuses to delete a task twice', async () => {
      const harness = new TasksHarness();
      const task = await harness.aTask();
      const command = {
        tenantId: TasksHarness.TENANT,
        actor: TasksHarness.ANA,
        taskId: task.id,
      };
      await harness.remove.execute(command);

      await expect(harness.remove.execute(command)).rejects.toMatchObject({
        code: TasksErrorCode.TaskNotFound,
      });
    });
  });
});
