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
 * Collects the dependencies that report their health. Each network adapter registers itself in its
 * `onModuleInit`; the service health endpoints query `checkAll`.
 */
export class HealthRegistry {
  /** Default timeout of each check, in milliseconds. */
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

  /** Adds a dependency. Throws `DuplicateHealthCheckError` if one with that `name` already exists. */
  register(check: HealthCheckable): void {
    if (this.checks.has(check.name)) {
      throw new DuplicateHealthCheckError(check.name);
    }
    this.checks.set(check.name, check);
  }

  /**
   * Checks all of them in parallel, each with its timeout and with `signal`.
   * One that throws or times out counts as `Down` and its `detail` is the name of the
   * error, never the message.
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

  /** Awaits the check, but rejects as soon as the signal is aborted. */
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
   * Only the name, never the message. The property is read because `instanceof
   * Error` fails with errors from another execution context, such as the
   * `DOMException` that `AbortSignal` uses inside Jest.
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
