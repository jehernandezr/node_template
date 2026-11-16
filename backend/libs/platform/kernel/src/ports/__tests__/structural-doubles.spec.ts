import type { Clock } from '../../time/clock.js';
import type { IdGenerator } from '../../ids/id-generator.js';
import { Id } from '../../ids/id.js';
import { ClaimState } from '../idempotency/claim-state.js';
import type { IdempotencyStore } from '../idempotency/idempotency-store.js';
import type { TransactionManager } from '../transaction/transaction-manager.js';
import { UuidV7IdGenerator } from '../../ids/uuid-v7-id-generator.js';

describe('ports accept object literals as test doubles', () => {
  it('Clock', () => {
    const clock: Clock = { now: () => new Date(0) };
    expect(clock.now().getTime()).toBe(0);
  });

  it('IdGenerator', () => {
    const id = Id.from('01941f29-7c00-7000-8000-000000000001');
    const generator: IdGenerator = { next: () => id };
    expect(generator.next()).toBe(id);
    expect(
      new UuidV7IdGenerator({ now: () => new Date(0) }).next(),
    ).toBeInstanceOf(Id);
  });

  it('TransactionManager', async () => {
    const manager: TransactionManager = {
      runInTransaction: (fn) =>
        fn({
          database: 'a',
          afterCommit: () => undefined,
          afterRollback: () => undefined,
        }),
      current: () => undefined,
      isInTransaction: () => false,
      afterCommit: () => undefined,
    };
    await expect(
      manager.runInTransaction(() => Promise.resolve(1)),
    ).resolves.toBe(1);
  });

  it('IdempotencyStore', async () => {
    const store: IdempotencyStore = {
      claim: () =>
        Promise.resolve({
          state: ClaimState.Completed,
          result: 1,
          fingerprint: 'f',
        }),
      complete: () => Promise.resolve(),
      release: () => Promise.resolve(),
    };
    await expect(
      store.claim('k', { fingerprint: 'f', deadline: { atMs: 1 } }),
    ).resolves.toMatchObject({ state: ClaimState.Completed });
  });
});
