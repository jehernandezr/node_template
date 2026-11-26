import { TimerScheduler } from '@platform/primitives';
import type { BulkheadOptions } from './bulkhead.options.js';

/**
 * Limits concurrent calls to a dependency. Those beyond `limit`
 * wait in a FIFO queue of `queue` places; if the queue is also full,
 * they are rejected immediately, so a slow dependency does not pile up work
 * without limit. A finished call hands its slot to the next one waiting.
 */
export class Bulkhead {
  private active = 0;
  private readonly waiting: (() => void)[] = [];

  constructor(private readonly options: BulkheadOptions) {}

  /**
   * Runs `fn` when a slot is free, queuing it otherwise and rejecting when the queue is full.
   * @param fn Work to run.
   * @param signal Abort signal of the caller.
   * @returns What `fn` returns.
   */
  async execute<T>(fn: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    if (this.active < this.options.limit) {
      this.active += 1;
    } else if (this.waiting.length < this.options.queue) {
      await this.waitForSlot(signal);
    } else {
      this.options.onReject?.();
      throw this.options.rejectWith();
    }
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  /**
   * Waits for a slot. If the call leaves the queue, the slot stays for the
   * others.
   */
  private waitForSlot(signal: AbortSignal | undefined): Promise<void> {
    if (signal?.aborted === true) {
      return Promise.reject(TimerScheduler.abortReason(signal));
    }
    return new Promise<void>((resolve, reject) => {
      const onAbort = (): void => {
        const index = this.waiting.indexOf(grant);
        if (index >= 0) {
          this.waiting.splice(index, 1);
        }
        reject(TimerScheduler.abortReason(signal as AbortSignal));
      };
      const grant = (): void => {
        signal?.removeEventListener('abort', onAbort);
        resolve();
      };
      this.waiting.push(grant);
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }

  private release(): void {
    const next = this.waiting.shift();
    if (next === undefined) {
      this.active -= 1;
    } else {
      next();
    }
  }
}
