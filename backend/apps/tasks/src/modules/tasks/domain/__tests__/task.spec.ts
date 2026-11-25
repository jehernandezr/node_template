import { TaskField, TaskStatus, TasksErrorCode } from '@contracts/tasks';
import { Task } from '../task.js';

const NOW = new Date('2026-11-20T10:00:00.000Z');
const LATER = new Date('2026-11-20T11:00:00.000Z');
const ANA = {
  userId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b01',
  homeTenantId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01',
};

const aSavedTask = (version = 3): Task =>
  Task.rehydrate({
    ...Task.create({
      id: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9c01',
      title: 'Send the invoice',
      description: '',
      createdBy: ANA,
      now: NOW,
    }).snapshot(),
    version,
  });

describe('Task', () => {
  it('starts open, authored by its creator', () => {
    const task = Task.create({
      id: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9c01',
      title: 'Send the invoice',
      description: 'For March',
      createdBy: ANA,
      now: NOW,
    });

    expect(task.snapshot()).toMatchObject({
      status: TaskStatus.Open,
      createdBy: ANA,
      createdAt: NOW,
      updatedAt: NOW,
    });
  });

  describe('when it changes', () => {
    it('reports only the fields whose value changed and the status transition', () => {
      const task = aSavedTask();

      const change = task.change(
        { title: 'Send the invoice', status: TaskStatus.Done },
        undefined,
        LATER,
      );

      expect(change).toEqual({
        changedFields: [TaskField.Status],
        statusBefore: TaskStatus.Open,
        statusAfter: TaskStatus.Done,
      });
      expect(task.snapshot().updatedAt).toEqual(LATER);
    });

    it('reports nothing and keeps its state when no value differs', () => {
      const task = aSavedTask();

      const change = task.change({ title: 'Send the invoice' }, 3, LATER);

      expect(change).toBeUndefined();
      expect(task.snapshot().updatedAt).toEqual(NOW);
    });

    it('rejects a change based on a version that is no longer current', () => {
      const task = aSavedTask(3);

      expect(() => task.change({ title: 'Another' }, 2, LATER)).toThrow(
        expect.objectContaining({ code: TasksErrorCode.TaskVersionConflict }),
      );
    });
  });

  it('records when it was deleted', () => {
    const task = aSavedTask();

    task.delete(LATER);

    expect(task.snapshot().deletedAt).toEqual(LATER);
  });
});
