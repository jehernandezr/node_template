import { HealthCheckable, type HealthReport } from '@platform/kernel';

/** Dependency that never responds, to test the timeout. */
export class HangingHealthCheck extends HealthCheckable {
  constructor(readonly name: string) {
    super();
  }

  override check(): Promise<HealthReport> {
    return new Promise<HealthReport>(() => undefined);
  }
}
