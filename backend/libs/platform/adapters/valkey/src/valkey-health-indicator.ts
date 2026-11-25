import {
  HealthCheckable,
  HealthState,
  type HealthReport,
} from '@platform/kernel';
import { ValkeyCommand } from './valkey-command.enum.js';
import type { ValkeyCommandExecutor } from './valkey-command-executor.js';

/** Health of the Valkey connection: `PING` within the signal deadline. */
export class ValkeyHealthIndicator extends HealthCheckable {
  readonly name = 'valkey';

  private static readonly PONG = 'PONG';

  constructor(private readonly executor: ValkeyCommandExecutor) {
    super();
  }

  /** `Up` if it answers `PONG`; `Down` with the error name if it fails or the signal is aborted. */
  async check(signal?: AbortSignal): Promise<HealthReport> {
    try {
      signal?.throwIfAborted();
      const reply = await this.abortable(
        this.executor.run(ValkeyCommand.Ping, []),
        signal,
      );
      return reply === ValkeyHealthIndicator.PONG
        ? { state: HealthState.Up }
        : { state: HealthState.Down, detail: 'unexpected reply' };
    } catch (error) {
      return {
        state: HealthState.Down,
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
