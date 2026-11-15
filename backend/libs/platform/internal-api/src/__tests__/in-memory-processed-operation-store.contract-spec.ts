import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import {
  runIdempotencyStoreContract,
  type ContractOrder,
} from '@platform/primitives/test-utils';
import { InMemoryProcessedOperationStore } from './utils/index.js';

describe('InMemoryProcessedOperationStore contract', () => {
  runIdempotencyStoreContract(() => {
    const clock = new FixedClock(new Date('2026-11-12T10:00:00.000Z'));
    const store = new InMemoryProcessedOperationStore<ContractOrder>(
      clock,
      new SequentialIdGenerator(),
    );
    return Promise.resolve({ store, clock });
  });
});
