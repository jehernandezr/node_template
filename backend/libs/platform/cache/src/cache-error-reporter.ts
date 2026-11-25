/**
 * Receives the failures the cache absorbs when falling back to a direct load. A
 * service connects them to its metrics or its logs.
 */
export abstract class CacheErrorReporter {
  abstract report(error: unknown): void;
}
