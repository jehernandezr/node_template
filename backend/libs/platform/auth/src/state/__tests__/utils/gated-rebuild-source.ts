/**
 * Rebuild source that delivers nothing until released. It counts the
 * times it starts being read and signals when it does, to test races.
 */
export class GatedRebuildSource implements AsyncIterable<readonly string[]> {
  /** Number of times iteration over the source started. */
  reads = 0;

  private readonly gate: Promise<void>;
  private openGate: () => void = () => undefined;
  private startedReading: () => void = () => undefined;
  private readonly started: Promise<void>;

  constructor(
    private readonly batches: readonly (readonly string[])[],
    private readonly failure?: Error,
  ) {
    this.gate = new Promise<void>((resolve) => {
      this.openGate = resolve;
    });
    this.started = new Promise<void>((resolve) => {
      this.startedReading = resolve;
    });
  }

  /** Opens the gate: iteration can continue. */
  release(): void {
    this.openGate();
  }

  /** Resolves when iteration has already started (before waiting on the gate). */
  waitUntilReading(): Promise<void> {
    return this.started;
  }

  async *[Symbol.asyncIterator](): AsyncIterator<readonly string[]> {
    this.reads += 1;
    this.startedReading();
    await this.gate;
    if (this.failure !== undefined) {
      throw this.failure;
    }
    yield* this.batches;
  }
}
