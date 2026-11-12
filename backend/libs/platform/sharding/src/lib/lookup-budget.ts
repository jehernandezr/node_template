import { DeadlineExceededError, type Deadline } from '@platform/primitives';

/** `setTimeout` accepts at most 2^31 − 1 ms; a longer deadline is only checked between steps. */
const MAX_TIMER_MS = 2_147_483_647;

/**
 * Time budget of one lookup: a {@link Deadline}, an `AbortSignal`, both or neither. It only stops the
 * caller from waiting; work shared with other callers (a single-flight load) keeps running.
 */
export class LookupBudget {
  constructor(
    private readonly deadline?: Deadline,
    private readonly signal?: AbortSignal,
  ) {}

  /**
   * Throws when the budget is already spent.
   * @throws The signal's `reason` when aborted; `DeadlineExceededError` when the deadline passed.
   */
  check(): void {
    this.signal?.throwIfAborted();
    this.deadline?.throwIfExpired();
  }

  /**
   * Waits for `promise` until it settles or the budget runs out, whichever comes first.
   * @throws The signal's `reason` when aborted; `DeadlineExceededError` when the deadline passes.
   */
  wait<T>(promise: Promise<T>): Promise<T> {
    const { deadline, signal } = this;
    if (deadline === undefined && signal === undefined) {
      return promise;
    }
    return new Promise<T>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const cleanup = (): void => {
        if (timer !== undefined) {
          clearTimeout(timer);
        }
        signal?.removeEventListener('abort', onAbort);
      };
      const onAbort = (): void => {
        cleanup();
        reject(signal?.reason);
      };
      const onDeadline = (): void => {
        cleanup();
        reject(new DeadlineExceededError((deadline as Deadline).atMs));
      };
      promise.then(
        (value) => {
          cleanup();
          resolve(value);
        },
        (error: unknown) => {
          cleanup();
          reject(error);
        },
      );
      if (signal?.aborted === true) {
        onAbort();
        return;
      }
      signal?.addEventListener('abort', onAbort, { once: true });
      if (deadline !== undefined) {
        const remaining = deadline.remaining();
        if (remaining === 0) {
          onDeadline();
        } else if (remaining <= MAX_TIMER_MS) {
          timer = setTimeout(onDeadline, remaining);
          timer.unref?.();
        }
      }
    });
  }
}
