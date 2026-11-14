import { abortReason } from '@platform/primitives';

/** Settings and hooks of a {@link Bulkhead}. */
export interface BulkheadOptions {
  /** Maximum concurrent calls. */
  readonly limit: number;
  /** Calls allowed to wait for a slot before rejection. */
  readonly queue: number;
  /** Error thrown when there is neither a free slot nor room in the queue. */
  readonly rejectWith: () => Error;
  readonly onReject?: () => void;
}

/**
 * Caps concurrent calls to one dependency. Calls beyond `limit` wait in a FIFO
 * queue of `queue` places; when the queue is full they are rejected at once,
 * so a slow dependency cannot pile up unbounded work. A finished call hands
 * its slot straight to the next waiter.
 */
export class Bulkhead {
  private active = 0;
  private readonly waiting: (() => void)[] = [];

  constructor(private readonly options: BulkheadOptions) {}

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

  /** Waits for a slot; leaving the queue on abort keeps the slot for others. */
  private waitForSlot(signal: AbortSignal | undefined): Promise<void> {
    if (signal?.aborted === true) {
      return Promise.reject(abortReason(signal));
    }
    return new Promise<void>((resolve, reject) => {
      const onAbort = (): void => {
        const index = this.waiting.indexOf(grant);
        if (index >= 0) {
          this.waiting.splice(index, 1);
        }
        reject(abortReason(signal as AbortSignal));
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
