import {
  ErrorDescriptor,
  Guard,
  HealthState,
  type HealthCheckable,
  type HealthReport,
} from '@platform/kernel';
import { DuplicateHealthCheckError } from '../errors/duplicate-health-check.error.js';
import type { HealthSummary } from './health-summary.js';

/**
 * Reúne las dependencias que informan su salud. Cada adaptador de red se
 * registra en su `onModuleInit`; los endpoints `/health/live` y `/health/ready`
 * (de `@platform/http`) consultan `checkAll`.
 */
export class HealthRegistry {
  /** Tiempo máximo por defecto de cada consulta, en milisegundos. */
  static readonly DEFAULT_TIMEOUT_MS = 2_000;

  private static readonly SEVERITY: Readonly<Record<HealthState, number>> = {
    [HealthState.Up]: 0,
    [HealthState.Degraded]: 1,
    [HealthState.Down]: 2,
  };

  private readonly checks = new Map<string, HealthCheckable>();

  constructor(
    private readonly timeoutMs: number = HealthRegistry.DEFAULT_TIMEOUT_MS,
  ) {
    Guard.default.positiveInteger('timeoutMs', timeoutMs);
  }

  /** Agrega una dependencia. Lanza `DuplicateHealthCheckError` si ya hay una con ese `name`. */
  register(check: HealthCheckable): void {
    if (this.checks.has(check.name)) {
      throw new DuplicateHealthCheckError(check.name);
    }
    this.checks.set(check.name, check);
  }

  /**
   * Consulta todas en paralelo, cada una con su tiempo máximo y con `signal`.
   * Una que lanza o se agota cuenta como `Down` y su `detail` es el nombre del
   * error, nunca el mensaje.
   */
  async checkAll(signal?: AbortSignal): Promise<HealthSummary> {
    const entries = await Promise.all(
      [...this.checks.values()].map(
        async (check) => [check.name, await this.probe(check, signal)] as const,
      ),
    );
    return {
      state: HealthRegistry.worst(entries.map(([, report]) => report)),
      checks: Object.fromEntries(entries),
    };
  }

  private async probe(
    check: HealthCheckable,
    signal?: AbortSignal,
  ): Promise<HealthReport> {
    const timeout = AbortSignal.timeout(this.timeoutMs);
    const combined =
      signal === undefined ? timeout : AbortSignal.any([signal, timeout]);
    try {
      return await this.race(check.check(combined), combined);
    } catch (error) {
      return {
        state: HealthState.Down,
        detail: HealthRegistry.nameOf(error),
      };
    }
  }

  /** Espera la consulta, pero rechaza en cuanto la señal se aborta. */
  private async race(
    work: Promise<HealthReport>,
    signal: AbortSignal,
  ): Promise<HealthReport> {
    if (signal.aborted) {
      throw signal.reason;
    }
    let rejectOnAbort: (reason: unknown) => void = () => undefined;
    const aborted = new Promise<never>((_resolve, reject) => {
      rejectOnAbort = reject;
    });
    const onAbort = (): void => rejectOnAbort(signal.reason);
    signal.addEventListener('abort', onAbort, { once: true });
    try {
      return await Promise.race([work, aborted]);
    } finally {
      signal.removeEventListener('abort', onAbort);
    }
  }

  /**
   * Solo el nombre, nunca el mensaje. Se lee la propiedad porque `instanceof
   * Error` falla con errores de otro contexto de ejecución, como el
   * `DOMException` que usa `AbortSignal` dentro de Jest.
   */
  private static nameOf(error: unknown): string {
    const name =
      typeof error === 'object' && error !== null
        ? (error as { name?: unknown }).name
        : undefined;
    return typeof name === 'string'
      ? name
      : ErrorDescriptor.describe(error).name;
  }

  private static worst(reports: readonly HealthReport[]): HealthState {
    return reports.reduce<HealthState>(
      (worst, report) =>
        HealthRegistry.SEVERITY[report.state] > HealthRegistry.SEVERITY[worst]
          ? report.state
          : worst,
      HealthState.Up,
    );
  }
}
