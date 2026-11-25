import type { HealthReport } from './health-report.js';

/** Dependency whose state can be queried, such as a database or cache client. */
export abstract class HealthCheckable {
  /** Stable name of the dependency in health reports. */
  abstract readonly name: string;

  abstract check(signal?: AbortSignal): Promise<HealthReport>;
}
