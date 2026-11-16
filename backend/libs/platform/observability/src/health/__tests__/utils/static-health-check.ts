import { HealthCheckable, type HealthReport } from '@platform/kernel';

/** Dependencia que responde siempre el mismo reporte. */
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
