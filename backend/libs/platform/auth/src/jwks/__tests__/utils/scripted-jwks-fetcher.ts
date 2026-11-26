import { JwksFetcher } from '../../jwks-fetcher.js';

/** Scripted downloads: each `fetch` takes the next reply from the queue; an `Error` is thrown. */
export class ScriptedJwksFetcher extends JwksFetcher {
  private readonly queue: unknown[];
  private fetched = 0;
  private gate: Promise<void> | undefined;
  private openGate: (() => void) | undefined;

  constructor(...answers: unknown[]) {
    super();
    this.queue = answers;
  }

  /** Number of times `fetch` was called, regardless of the result. */
  get fetchCount(): number {
    return this.fetched;
  }

  /** Makes the following calls wait until `release()` before answering. */
  hold(): void {
    this.gate = new Promise<void>((resolve) => {
      this.openGate = resolve;
    });
  }

  /** Releases the calls held by `hold()`. */
  release(): void {
    this.openGate?.();
    this.gate = undefined;
    this.openGate = undefined;
  }

  override async fetch(): Promise<unknown> {
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
