import type { Clock } from '@platform/kernel';
import {
  Deadline,
  DeadlineExceededError,
  TimerScheduler,
} from '@platform/primitives';
import type { CallerWaitOptions } from './caller-wait.options.js';

/**
 * A caller's wait on work that may be shared. The work
 * is never cancelled: if the caller gives up, other callers waiting on the
 * same result still receive it.
 */
export class CallerWait {
  /**
   * Deadline equivalent to having no limit. `Deadline` requires a finite
   * budget, and a wait for a cache load never lasts a year.
   */
  static readonly UNBOUNDED_MS = 365 * 24 * 60 * 60 * 1000;

  constructor(private readonly clock: Clock) {}

  /** Why the caller can no longer wait, or `undefined` while it can. */
  cancellation(options: CallerWaitOptions): Error | undefined {
    if (options.signal?.aborted === true) {
      return TimerScheduler.abortReason(options.signal);
    }
    if (options.deadline?.isExpired() === true) {
      return new DeadlineExceededError(options.deadline.atMs);
    }
    return undefined;
  }

  /**
   * Waits for `work` until it settles, the signal aborts or the deadline expires,
   * whichever happens first. Without a signal or deadline it returns the same promise.
   * `work` may reject later and nobody else listens to it.
   */
  wait<T>(work: Promise<T>, options: CallerWaitOptions): Promise<T> {
    if (options.signal === undefined && options.deadline === undefined) {
      return work;
    }
    const cancelled = this.cancellation(options);
    if (cancelled !== undefined) {
      work.catch(() => undefined);
      return Promise.reject(cancelled);
    }
    const deadline =
      options.deadline ?? Deadline.after(CallerWait.UNBOUNDED_MS, this.clock);
    return deadline.wait(work, options.signal);
  }
}
