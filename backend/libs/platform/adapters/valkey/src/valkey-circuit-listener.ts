/** Hears when Valkey stops and starts answering, as the circuit of every command sees it. */
export interface ValkeyCircuitListener {
  /** The circuit opened: commands fail at once until a trial succeeds. */
  opened(): void;
  /** A trial command succeeded after an outage and the circuit closed. */
  closed(): void;
}
