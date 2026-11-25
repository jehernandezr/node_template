import { HealthCheckable, type HealthReport } from '@platform/kernel';

/** Dependency that always responds with the same report. */
export class StaticHealthCheck extends HealthCheckable {
  constructor(
    readonly name: string,
    private readonly report: HealthReport,
  ) {
    super();
  }

  check(): Promise<HealthReport> {
    return Promise.resolve(this.report);
  }
}
