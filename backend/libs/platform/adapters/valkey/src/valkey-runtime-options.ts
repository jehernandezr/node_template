import type { ValkeyCircuitOptions } from './valkey-circuit.options.js';

/** Connection values that come from the runtime and not from the environment. */
export interface ValkeyRuntimeOptions {
  /** Name shown by `CLIENT LIST`, for example the service name. */
  readonly connectionName?: string;
  /** Time to establish a connection. Defaults to 2 000 ms. */
  readonly connectTimeoutMs?: number;
  /**
   * Client-side bound of a command. Defaults to 1 000 ms. The resilience
   * policy of each caller sets the real, shorter limit; this one only
   * keeps a command from hanging forever.
   */
  readonly commandTimeoutMs?: number;
  /** Deadline and breaker of every command. Each value left out takes `ValkeyCircuit.DEFAULTS`. */
  readonly circuit?: Partial<ValkeyCircuitOptions>;
}
