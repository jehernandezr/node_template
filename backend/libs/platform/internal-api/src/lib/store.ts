import { SystemClock, UuidV7IdGenerator } from '@platform/kernel';
import type { Clock, IdGenerator } from '@platform/kernel';
import {
  InMemoryIdempotencyStore,
  type ClaimResult,
  type FinalOutcome,
  type IdempotencyStore,
} from '@platform/primitives';

export { ClaimState } from '@platform/primitives';
export type { ClaimRequest } from '@platform/primitives';

/**
 * Idempotency store of the router: the three-state, fenced port of
 * `@platform/primitives`, storing final outcomes (success or declared
 * business error). A production store writes `complete` in the same unit of
 * work as the handler's side effects, so a result is stored if and only if
 * its effects were committed.
 */
export type ProcessedOperationStore = IdempotencyStore<FinalOutcome<unknown>>;

/** @deprecated Use `ClaimResult` from `@platform/primitives`. */
export type ClaimOutcome = ClaimResult<FinalOutcome<unknown>>;

/**
 * Process-local store. Atomic within one process, suitable for tests and
 * single-process use only.
 */
export class InMemoryProcessedOperationStore extends InMemoryIdempotencyStore<
  FinalOutcome<unknown>
> {
  constructor(
    clock: Clock = new SystemClock(),
    ids: IdGenerator = new UuidV7IdGenerator(),
  ) {
    super(clock, ids);
  }
}
