import type { UnitOfWork } from '@platform/kernel';
import { RecordingTransactionManager } from '../../../__tests__/utils/recording-transaction-manager.js';

/** Unidad de trabajo cuyo `COMMIT` se pierde después de que el trabajo terminó. */
export class FailingCommitTransactionManager extends RecordingTransactionManager {
  override async runInTransaction<T>(
    fn: (uow: UnitOfWork) => Promise<T>,
  ): Promise<T> {
    await super.runInTransaction(fn);
    throw Object.assign(new Error('connection lost during COMMIT'), {
      code: 'ECONNRESET',
    });
  }
}
