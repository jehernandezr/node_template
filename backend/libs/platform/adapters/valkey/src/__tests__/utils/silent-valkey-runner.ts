import type { ValkeyCommandRunner } from '../../valkey-command-runner.js';

/** A server that accepts every command and never answers, as a stalled connection does. */
export class SilentValkeyRunner implements ValkeyCommandRunner {
  calls = 0;

  call(): Promise<unknown> {
    this.calls += 1;
    return new Promise<never>(() => undefined);
  }
}
