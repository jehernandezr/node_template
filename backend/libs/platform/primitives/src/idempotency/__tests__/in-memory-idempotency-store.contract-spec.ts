import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import {
  runIdempotencyStoreContract,
  type ContractOrder,
} from '../../__tests__/utils/idempotency-store-contract.js';
import { InMemoryIdempotencyStore } from '../in-memory-idempotency-store.js';

describe('InMemoryIdempotencyStore contract', () => {
  runIdempotencyStoreContract(() => {
    const clock = new FixedClock(new Date('2026-11-12T10:00:00.000Z'));
    const store = new InMemoryIdempotencyStore<ContractOrder>(
      clock,
      new SequentialIdGenerator(),
    );
    return Promise.resolve({ store, clock });
  });
});
