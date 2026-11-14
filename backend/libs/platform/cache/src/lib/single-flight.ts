import { CacheInvalidArgumentError, CacheKeyTooLongError } from './errors.js';
import { cancellation, waitFor, type WaitOptions } from './wait.js';

export type { WaitOptions } from './wait.js';

/** Default bound for a single-flight key, in characters. */
export const DEFAULT_SINGLE_FLIGHT_MAX_KEY_LENGTH = 1_024;

/** Options for {@link SingleFlight}. */
export interface SingleFlightOptions {
  /** Longest key accepted. Defaults to {@link DEFAULT_SINGLE_FLIGHT_MAX_KEY_LENGTH}. */
  maxKeyLength?: number;
}

/** Deduplicates concurrent executions that share a key. */
export class SingleFlight {
  private readonly inFlight = new Map<string, Promise<unknown>>();
  private readonly maxKeyLength: number;

  constructor(options: SingleFlightOptions = {}) {
    const maxKeyLength =
      options.maxKeyLength ?? DEFAULT_SINGLE_FLIGHT_MAX_KEY_LENGTH;
    if (!Number.isInteger(maxKeyLength) || maxKeyLength < 1) {
      throw new CacheInvalidArgumentError('maxKeyLength', 'an integer >= 1');
    }
    this.maxKeyLength = maxKeyLength;
  }

  /** Executions currently in progress. */
  get size(): number {
    return this.inFlight.size;
  }

  /**
   * Runs `fn` unless a call with the same key is already in progress, in which case
   * that call's promise is shared. The key is released once the execution settles.
   * Errors reach every waiter.
   *
   * `options` only bounds this caller's wait: when its signal aborts or its
   * deadline expires it rejects, while the shared execution keeps running for
   * the other waiters. A caller that is already cancelled does not start `fn`.
   * @throws CacheKeyTooLongError when the key exceeds `maxKeyLength`.
   */
  run<T>(
    key: string,
    fn: () => Promise<T>,
    options: WaitOptions = {},
  ): Promise<T> {
    if (key.length > this.maxKeyLength) {
      return Promise.reject(
        new CacheKeyTooLongError(key.length, this.maxKeyLength),
      );
    }
    const existing = this.inFlight.get(key) as Promise<T> | undefined;
    if (existing !== undefined) {
      return waitFor(existing, options);
    }
    const cancelled = cancellation(options);
    if (cancelled !== undefined) {
      return Promise.reject(cancelled);
    }
    const promise = new Promise<T>((resolve) => resolve(fn()));
    this.inFlight.set(key, promise);
    const release = (): void => {
      if (this.inFlight.get(key) === promise) {
        this.inFlight.delete(key);
      }
    };
    promise.then(release, release);
    return waitFor(promise, options);
  }
}
