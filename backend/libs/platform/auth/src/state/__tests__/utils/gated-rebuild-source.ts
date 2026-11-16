/**
 * Fuente de reconstrucción que no entrega nada hasta que se libera. Cuenta las
 * veces que empieza a leerse y avisa cuando ya lo hace, para probar carreras.
 */
export class GatedRebuildSource implements AsyncIterable<readonly string[]> {
  /** Veces que empezó a iterarse la fuente. */
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

  /** Abre la compuerta: la iteración puede seguir. */
  release(): void {
    this.openGate();
  }

  /** Resuelve cuando la iteración ya empezó (antes de esperar la compuerta). */
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
