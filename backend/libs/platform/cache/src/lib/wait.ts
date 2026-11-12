import { DeadlineExceededError, type Deadline } from '@platform/primitives';

/** How long one caller is willing to wait. It never affects other callers. */
export interface WaitOptions {
  /** The caller stops waiting and rejects with the signal's reason when it aborts. */
  signal?: AbortSignal;
  /** The caller stops waiting and rejects with `DeadlineExceededError` when it expires. */
  deadline?: Deadline;
}

function abortReason(signal: AbortSignal): Error {
  return signal.reason instanceof Error
    ? signal.reason
    : new Error('Wait aborted', { cause: signal.reason });
}

/** Why a caller can no longer wait, or undefined while it still can. */
export function cancellation({
  signal,
  deadline,
}: WaitOptions): Error | undefined {
  if (signal?.aborted) {
    return abortReason(signal);
  }
  if (deadline?.isExpired()) {
    return new DeadlineExceededError(deadline.atMs);
  }
  return undefined;
}

/**
 * Waits for `work` until it settles, the signal aborts or the deadline expires,
 * whichever comes first. `work` is never cancelled: other waiters still get
 * its result. Timers and listeners are released when the wait ends.
 */
export function waitFor<T>(
  work: Promise<T>,
  { signal, deadline }: WaitOptions = {},
): Promise<T> {
  if (signal === undefined && deadline === undefined) {
    return work;
  }
  const cancelled = cancellation({ signal, deadline });
  if (cancelled !== undefined) {
    // `work` may still reject later; nobody else may be listening.
    work.catch(() => undefined);
    return Promise.reject(cancelled);
  }
  const remaining = deadline?.remaining();
  return new Promise<T>((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cleanup = (): void => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    };
    const onAbort = (): void => {
      cleanup();
      reject(abortReason(signal as AbortSignal));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    if (deadline !== undefined && remaining !== undefined) {
      timer = setTimeout(() => {
        cleanup();
        reject(new DeadlineExceededError(deadline.atMs));
      }, remaining);
    }
    work.then(
      (value) => {
        cleanup();
        resolve(value);
      },
      (error: unknown) => {
        cleanup();
        reject(error);
      },
    );
  });
}
