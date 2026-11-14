import { HealthCheckable, type HealthReport } from '@platform/kernel';

/** Dependencia que nunca responde, para probar el tiempo máximo. */
export class HangingHealthCheck extends HealthCheckable {
  constructor(readonly name: string) {
    super();
  }

  check(): Promise<HealthReport> {
    return new Promise<HealthReport>(() => undefined);
  }
}
