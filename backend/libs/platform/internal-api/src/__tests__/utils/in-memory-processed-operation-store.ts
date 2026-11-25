import type { Clock, IdGenerator } from '@platform/kernel';
import {
  InMemoryIdempotencyStore,
  type FinalOutcome,
} from '@platform/primitives';

/**
 * In-memory router idempotency store, for tests. It is atomic
 * within a process, but it is not a runtime mode: a real service uses
 * the store from `adapters-postgres`. The result type is generic only
 * so the shared contract test can store its own.
 */
export class InMemoryProcessedOperationStore<
  R = FinalOutcome<unknown>,
> extends InMemoryIdempotencyStore<R> {
  constructor(clock: Clock, ids: IdGenerator) {
    super(clock, ids);
  }
}
