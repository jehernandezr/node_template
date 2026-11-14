import { InMemoryProcessedMessageStore } from '@platform/messaging';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/testing';
import { ClaimState, Deadline } from '@platform/primitives';
import { memoryShard, START } from '../../test/support/pg-mem.js';
import { processedMessageStoreContract } from '../../test/support/processed-message-contract.js';
import { PostgresProcessedMessageStore } from './postgres-processed-message-store.js';

describe('PostgresProcessedMessageStore on pg-mem', () => {
  processedMessageStoreContract(async () => {
    const { database, clock, ids } = await memoryShard();
    return {
      store: new PostgresProcessedMessageStore({
        databases: database,
        ids,
        clock,
      }),
      clock,
    };
  });

  it('purges completed messages older than the cutoff', async () => {
    const { database, clock, ids } = await memoryShard();
    const store = new PostgresProcessedMessageStore({
      databases: database,
      ids,
      clock,
    });
    const claim = await store.claim('k', {
      fingerprint: 'fp',
      deadline: Deadline.after(1_000, clock),
    });
    if (claim.state !== ClaimState.Acquired) throw new Error('unreachable');
    await store.complete('k', claim.claimToken, { processedAt: 1 });
    expect(await store.purgeCompleted(START.getTime())).toBe(0);
    expect(await store.purgeCompleted(START.getTime() + 1)).toBe(1);
  });
});

describe('InMemoryProcessedMessageStore (reference)', () => {
  processedMessageStoreContract(async () => {
    const clock = new FixedClock(START);
    return {
      store: new InMemoryProcessedMessageStore(
        clock,
        new SequentialIdGenerator(START),
      ),
      clock,
    };
  });
});
