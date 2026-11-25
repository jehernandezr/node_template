import type { Clock } from '@platform/kernel';
import { Deadline } from '@platform/primitives';

/**
 * Time budget of a lookup: a `Deadline`, an `AbortSignal`, both
 * or neither. It only stops the caller from waiting; work shared with
 * other callers (a single-flight load) keeps running.
 */
export class LookupBudget {
  constructor(
    private readonly clock: Clock,
    private readonly deadline?: Deadline,
    private readonly signal?: AbortSignal,
  ) {}

  /**
   * Throws if the budget is already exhausted.
   * @throws The signal `reason` if it aborted; `DeadlineExceededError` if the deadline passed.
   */
  check(): void {
    this.signal?.throwIfAborted();
    this.deadline?.throwIfExpired();
  }

  /**
   * Waits for `promise` until it settles or the budget runs out, whichever comes first.
   * @throws The signal `reason` if it aborts; `DeadlineExceededError` if the deadline expires.
   */
  wait<T>(promise: Promise<T>): Promise<T> {
    if (this.deadline !== undefined) {
      return this.deadline.wait(promise, this.signal);
    }
    if (this.signal !== undefined) {
      // Without a deadline, `Deadline` already waits on the signal; a deadline that never expires leaves it alone.
      return Deadline.at(Number.MAX_SAFE_INTEGER, this.clock).wait(
        promise,
        this.signal,
      );
    }
    return promise;
  }
}
