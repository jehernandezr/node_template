import { CallerWait } from './caller-wait.js';
import type { CallerWaitOptions } from './caller-wait.options.js';
import { CacheKeyTooLongError } from './errors/cache-key-too-long.error.js';
import { CacheGuard } from './errors/cache-guard.js';
import type { SingleFlightOptions } from './single-flight.options.js';

/**
 * Joins concurrent executions that share a key: while one is in
 * flight, the others receive its same promise instead of repeating the work.
 */
export class SingleFlight {
  /** Default maximum length of a key, in characters. */
  static readonly DEFAULT_MAX_KEY_LENGTH = 1_024;

  private readonly inFlight = new Map<string, Promise<unknown>>();
  private readonly maxKeyLength: number;

  constructor(
    private readonly wait: CallerWait,
    options: SingleFlightOptions = {},
  ) {
    this.maxKeyLength = CacheGuard.instance.positiveInteger(
      'maxKeyLength',
      options.maxKeyLength ?? SingleFlight.DEFAULT_MAX_KEY_LENGTH,
    );
  }

  /** Runs in progress. */
  get size(): number {
    return this.inFlight.size;
  }

  /**
   * Runs `fn` unless one is already running with the same key, in which case
   * it shares its promise. The key is released when it finishes, with success or error.
   *
   * `options` only bounds the caller's wait: if it aborts or its deadline expires,
   * that caller rejects while the shared execution continues for the others.
   * An already cancelled caller does not start `fn`.
   * @throws CacheKeyTooLongError when the key exceeds `maxKeyLength`.
   */
  run<T>(
    key: string,
    fn: () => Promise<T>,
    options: CallerWaitOptions = {},
  ): Promise<T> {
    if (key.length > this.maxKeyLength) {
      return Promise.reject(
        new CacheKeyTooLongError(key.length, this.maxKeyLength),
      );
    }
    const existing = this.inFlight.get(key) as Promise<T> | undefined;
    if (existing !== undefined) {
      return this.wait.wait(existing, options);
    }
    const cancelled = this.wait.cancellation(options);
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
    return this.wait.wait(promise, options);
  }
}
