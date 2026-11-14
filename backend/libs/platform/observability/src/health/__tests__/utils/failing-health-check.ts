import { HealthCheckable, type HealthReport } from '@platform/kernel';

/** Dependencia cuya consulta siempre lanza el error dado. */
export class FailingHealthCheck extends HealthCheckable {
  constructor(
    readonly name: string,
    private readonly error: unknown,
  ) {
    super();
  }

  check(): Promise<HealthReport> {
    return Promise.reject(this.error);
  }
}
