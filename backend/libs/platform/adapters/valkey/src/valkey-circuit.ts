import type { Clock } from '@platform/kernel';
import { FailureKind } from '@platform/kernel';
import { TimerScheduler } from '@platform/primitives';
import {
  CircuitOpenError,
  CircuitState,
  ConsecutiveCircuitBreaker,
} from '@platform/resilience';
import type { ValkeyCircuitListener } from './valkey-circuit-listener.js';
import type { ValkeyCircuitOptions } from './valkey-circuit.options.js';
import { ValkeyUnavailableError } from './valkey-unavailable.error.js';

/**
 * Bounds every Valkey command with a deadline and a circuit breaker shared by all the adapters of a client, so an
 * outage adds at most the deadline to a request and, once the circuit opens, nothing. Only
 * `ValkeyUnavailableError` counts as a failure; a malformed command does not open the circuit.
 */
export class ValkeyCircuit {
  /** Deadline and breaker used when the module does not set them. */
  static readonly DEFAULTS: ValkeyCircuitOptions = {
    deadlineMs: 500,
    consecutiveFailures: 5,
    halfOpenAfterMs: 5_000,
  };

  private static readonly DEPENDENCY = 'valkey';

  private readonly breaker: ConsecutiveCircuitBreaker;
  private readonly listeners = new Set<ValkeyCircuitListener>();

  constructor(
    clock: Clock,
    private readonly options: ValkeyCircuitOptions = ValkeyCircuit.DEFAULTS,
  ) {
    this.breaker = new ConsecutiveCircuitBreaker({
      consecutiveFailures: options.consecutiveFailures,
      halfOpenAfterMs: options.halfOpenAfterMs,
      clock,
      counts: (error) => error instanceof ValkeyUnavailableError,
      rejectWith: () =>
        new CircuitOpenError(
          ValkeyCircuit.DEPENDENCY,
          ValkeyCircuit.DEPENDENCY,
        ),
      onBreak: () => this.notify((listener) => listener.opened()),
      onReset: () => this.notify((listener) => listener.closed()),
    });
  }

  /**
   * Whether commands currently fail at once.
   * @returns True while the circuit is open.
   */
  get open(): boolean {
    return this.breaker.state === CircuitState.Open;
  }

  /**
   * Runs one command within the deadline, unless the circuit is open.
   * @param command Command name, for the error.
   * @param work The command; it throws `ValkeyUnavailableError` when Valkey does not answer.
   * @returns What the command returns.
   * @throws ValkeyUnavailableError when the circuit is open or the deadline passes.
   */
  async run<T>(command: string, work: () => Promise<T>): Promise<T> {
    try {
      return await this.breaker.execute(() =>
        this.withinDeadline(command, work),
      );
    } catch (error) {
      if (error instanceof CircuitOpenError) {
        throw new ValkeyUnavailableError(command, FailureKind.Transient, error);
      }
      throw error;
    }
  }

  /**
   * Hears when the circuit opens and closes.
   * @param listener Who to tell.
   * @returns The function that stops telling it.
   */
  subscribe(listener: ValkeyCircuitListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private withinDeadline<T>(
    command: string,
    work: () => Promise<T>,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const cancel = TimerScheduler.armDetached(this.options.deadlineMs, () =>
        reject(new ValkeyUnavailableError(command, FailureKind.Timeout)),
      );
      work().then(
        (value) => {
          cancel();
          resolve(value);
        },
        (error: unknown) => {
          cancel();
          reject(error);
        },
      );
    });
  }

  private notify(tell: (listener: ValkeyCircuitListener) => void): void {
    for (const listener of [...this.listeners]) {
      try {
        tell(listener);
      } catch {}
    }
  }
}
