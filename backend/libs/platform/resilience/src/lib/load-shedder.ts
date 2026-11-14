import { OverloadedError } from './errors.js';

/** Options for {@link LoadShedder}. */
export interface LoadShedderOptions {
  /** Maximum calls in progress at the same time. */
  readonly maxInFlight: number;
  /** Retry hint attached to rejected calls, in milliseconds. */
  readonly retryAfterMs: number;
}

/** Rejects work above a concurrency threshold instead of queuing it. */
export class LoadShedder {
  private current = 0;

  /** @param options Concurrency limit and retry hint. */
  constructor(private readonly options: LoadShedderOptions) {}

  /** Calls currently in progress. */
  get inFlight(): number {
    return this.current;
  }

  /**
   * Reserves a slot.
   * @returns Release function; calling it more than once has no extra effect.
   * @throws OverloadedError (a `ResilienceError` with code Overloaded) and `retryAfterMs` when the limit is reached.
   */
  tryAcquire(): () => void {
    if (this.current >= this.options.maxInFlight) {
      throw new OverloadedError(this.options.retryAfterMs);
    }
    this.current += 1;
    let released = false;
    return () => {
      if (!released) {
        released = true;
        this.current -= 1;
      }
    };
  }
}
