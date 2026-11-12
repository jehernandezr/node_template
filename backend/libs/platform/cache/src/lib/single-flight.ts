/** Deduplicates concurrent executions that share a key. */
export class SingleFlight {
  private readonly inFlight = new Map<string, Promise<unknown>>();

  /**
   * Runs `fn` unless a call with the same key is already in progress, in which case
   * that call's promise is shared. The key is released once the execution settles.
   * Errors reach every waiter.
   */
  run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.inFlight.get(key);
    if (existing !== undefined) {
      return existing as Promise<T>;
    }
    const promise = new Promise<T>((resolve) => resolve(fn()));
    this.inFlight.set(key, promise);
    const release = (): void => {
      if (this.inFlight.get(key) === promise) {
        this.inFlight.delete(key);
      }
    };
    promise.then(release, release);
    return promise;
  }
}
