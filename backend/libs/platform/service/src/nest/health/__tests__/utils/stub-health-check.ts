import {
  HealthCheckable,
  type HealthReport,
  type HealthState,
} from '@platform/kernel';

/** Dependencia de salud con un resultado fijo o con un error, sin red. */
export class StubHealthCheck extends HealthCheckable {
  constructor(
    readonly name: string,
    private readonly outcome: () => Promise<HealthReport>,
  ) {
    super();
  }

  static reporting(name: string, state: HealthState): StubHealthCheck {
    return new StubHealthCheck(name, () => Promise.resolve({ state }));
  }

  static failing(name: string, error: Error): StubHealthCheck {
    return new StubHealthCheck(name, () => Promise.reject(error));
  }

  check(): Promise<HealthReport> {
    return this.outcome();
  }
}
