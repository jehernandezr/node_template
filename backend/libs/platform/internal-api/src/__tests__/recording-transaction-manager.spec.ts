import { RecordingTransactionManager } from './utils/index.js';

describe('RecordingTransactionManager', () => {
  it('counts a commit when the work resolves', async () => {
    const transactions = new RecordingTransactionManager();

    await expect(
      transactions.runInTransaction(() => Promise.resolve(7)),
    ).resolves.toBe(7);

    expect(transactions).toMatchObject({ commits: 1, rollbacks: 0 });
  });

  it('counts a rollback when the work throws and rethrows the error', async () => {
    const transactions = new RecordingTransactionManager();

    await expect(
      transactions.runInTransaction(() => Promise.reject(new Error('boom'))),
    ).rejects.toThrow('boom');

    expect(transactions).toMatchObject({ commits: 0, rollbacks: 1 });
  });

  it('reports an open unit of work only while the work runs', async () => {
    const transactions = new RecordingTransactionManager();

    await transactions.runInTransaction(() => {
      expect(transactions.isInTransaction()).toBe(true);
      return Promise.resolve();
    });

    expect(transactions.isInTransaction()).toBe(false);
  });
});
