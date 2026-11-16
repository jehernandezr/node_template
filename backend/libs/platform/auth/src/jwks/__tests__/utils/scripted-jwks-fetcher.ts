import { JwksFetcher } from '../../jwks-fetcher.js';

/** Descargas guionadas: cada `fetch` saca la siguiente respuesta de la cola; un `Error` se lanza. */
export class ScriptedJwksFetcher extends JwksFetcher {
  private readonly queue: unknown[];
  private fetched = 0;
  private gate: Promise<void> | undefined;
  private openGate: (() => void) | undefined;

  constructor(...answers: unknown[]) {
    super();
    this.queue = answers;
  }

  /** Veces que se llamó a `fetch`, sin importar el resultado. */
  get fetchCount(): number {
    return this.fetched;
  }

  /** Las llamadas siguientes esperan hasta `release()` antes de responder. */
  hold(): void {
    this.gate = new Promise<void>((resolve) => {
      this.openGate = resolve;
    });
  }

  /** Libera las llamadas detenidas por `hold()`. */
  release(): void {
    this.openGate?.();
    this.gate = undefined;
    this.openGate = undefined;
  }

  async fetch(): Promise<unknown> {
    this.fetched += 1;
    if (this.gate !== undefined) {
      await this.gate;
    }
    const answer = this.queue.shift();
    if (answer instanceof Error) {
      throw answer;
    }
    return answer;
  }
}
