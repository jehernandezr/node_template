import type { ValkeyCircuitListener } from '../../valkey-circuit-listener.js';

/** Records each time the circuit opens and closes, in order. */
export class RecordingCircuitListener implements ValkeyCircuitListener {
  readonly events: string[] = [];

  opened(): void {
    this.events.push('opened');
  }

  closed(): void {
    this.events.push('closed');
  }
}
