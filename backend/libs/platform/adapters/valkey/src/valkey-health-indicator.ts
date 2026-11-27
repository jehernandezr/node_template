import {
  HealthCheckable,
  HealthState,
  type HealthReport,
} from '@platform/kernel';
import { ValkeyCommand } from './valkey-command.enum.js';
import type { ValkeyCommandExecutor } from './valkey-command-executor.js';

/**
 * Health of the Valkey connection: `PING` within the signal deadline. Valkey is not part of readiness: a failure
 * reports `Degraded`, never `Down`, so an outage does not take every instance out of the load balancer while the
 * checks that need Valkey fail closed and the rest degrade.
 */
export class ValkeyHealthIndicator extends HealthCheckable {
  readonly name = 'valkey';

  private static readonly PONG = 'PONG';

  constructor(private readonly executor: ValkeyCommandExecutor) {
    super();
  }

  /** `Up` if it answers `PONG`; `Degraded` with the error name if it fails, replies otherwise or the signal is aborted. */
  override async check(signal?: AbortSignal): Promise<HealthReport> {
    try {
      signal?.throwIfAborted();
      const reply = await this.abortable(
        this.executor.run(ValkeyCommand.Ping, []),
        signal,
      );
      return reply === ValkeyHealthIndicator.PONG
        ? { state: HealthState.Up }
        : { state: HealthState.Degraded, detail: 'unexpected reply' };
    } catch (error) {
      return {
        state: HealthState.Degraded,
        detail: ValkeyHealthIndicator.nameOf(error),
      };
    }
  }

  /**
   * Only the name, never the message. The property is read because `instanceof
   * Error` fails with errors from another execution context, such as the
   * `DOMException` of `AbortSignal` inside Jest.
   */
  private static nameOf(error: unknown): string {
    const name =
      typeof error === 'object' && error !== null
        ? (error as { name?: unknown }).name
        : undefined;
    return typeof name === 'string' ? name : 'Error';
  }

  private abortable<T>(work: Promise<T>, signal?: AbortSignal): Promise<T> {
    if (signal === undefined) {
      return work;
    }
    return new Promise<T>((resolve, reject) => {
      const onAbort = (): void => reject(signal.reason);
      signal.addEventListener('abort', onAbort, { once: true });
      work
        .then(resolve, reject)
        .finally(() => signal.removeEventListener('abort', onAbort));
    });
  }
}
