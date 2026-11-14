import * as kernel from '@platform/kernel';
import * as idempotency from '../../idempotency/idempotency-store.js';
import * as transaction from '../transaction-manager.js';

describe('deprecated port re-exports', () => {
  it('serve the same classes and enums as the kernel', () => {
    expect(transaction.TransactionManager).toBe(kernel.TransactionManager);
    expect(transaction.IsolationLevel).toBe(kernel.IsolationLevel);
    expect(idempotency.IdempotencyStore).toBe(kernel.IdempotencyStore);
    expect(idempotency.ClaimState).toBe(kernel.ClaimState);
  });
});
