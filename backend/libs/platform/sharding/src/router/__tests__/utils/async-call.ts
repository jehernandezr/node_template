/**
 * Runs an action that may throw synchronously and returns a promise,
 * to check an error code with `rejects.toMatchObject`.
 */
export class AsyncCall {
  static run<T>(action: () => T): Promise<T> {
    return Promise.resolve().then(action);
  }
}
