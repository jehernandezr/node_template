import { HealthCheckable, type HealthReport } from '@platform/kernel';

/** Dependency whose query always throws the given error. */
export class FailingHealthCheck extends HealthCheckable {
  constructor(
    readonly name: string,
    private readonly error: unknown,
  ) {
    super();
  }

  override check(): Promise<HealthReport> {
    return Promise.reject(this.error);
  }
}
