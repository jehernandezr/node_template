import type { ValkeyCircuitListener } from '../../valkey-circuit-listener.js';

/** Circuit listener that fails every time it is told something. */
export class ThrowingCircuitListener implements ValkeyCircuitListener {
  constructor(readonly failure: Error) {}

  opened(): void {
    throw this.failure;
  }

  closed(): void {
    throw this.failure;
  }
}
