/**
 * Receives the failures the cache absorbs when falling back to a direct load. A
 * service connects them to its metrics or its logs.
 */
export abstract class CacheErrorReporter {
  /**
   * Reports a cache failure that was absorbed.
   * @param error Failure.
   */
  abstract report(error: unknown): void;
}
