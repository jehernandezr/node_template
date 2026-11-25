/** Lets the pending promises run with real timers. */
export class Flush {
  static macrotask(): Promise<void> {
    return new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
  }
}
