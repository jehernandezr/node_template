/** Holds the answer to the first erasure step of a user until the test releases it. */
export class ErasureHold {
  private markReached: () => void = () => undefined;
  private markReleased: () => void = () => undefined;
  /** Settles when the step of the held user reaches the peer. */
  readonly reached = new Promise<void>((resolve) => {
    this.markReached = resolve;
  });
  private readonly released = new Promise<void>((resolve) => {
    this.markReleased = resolve;
  });

  /**
   * Records that the held step arrived and waits until the test releases it.
   * @returns A promise that settles on release.
   */
  arrive(): Promise<void> {
    this.markReached();
    return this.released;
  }

  /** Lets the held step answer. */
  release(): void {
    this.markReleased();
  }
}
