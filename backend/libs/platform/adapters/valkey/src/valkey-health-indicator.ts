import {
  HealthCheckable,
  HealthState,
  type HealthReport,
} from '@platform/kernel';
import { ValkeyCommand } from './valkey-command.enum.js';
import type { ValkeyCommandExecutor } from './valkey-command-executor.js';

/** Salud de la conexión a Valkey: `PING` dentro del plazo de la señal. */
export class ValkeyHealthIndicator extends HealthCheckable {
  readonly name = 'valkey';

  private static readonly PONG = 'PONG';

  constructor(private readonly executor: ValkeyCommandExecutor) {
    super();
  }

  /** `Up` si responde `PONG`; `Down` con el nombre del error si falla o la señal se aborta. */
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
   * Solo el nombre, nunca el mensaje. Se lee la propiedad porque `instanceof
   * Error` falla con errores de otro contexto de ejecución, como el
   * `DOMException` de `AbortSignal` dentro de Jest.
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
