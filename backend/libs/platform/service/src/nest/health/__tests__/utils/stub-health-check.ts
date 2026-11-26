import {
  HealthCheckable,
  type HealthReport,
  type HealthState,
} from '@platform/kernel';

/** Health dependency with a fixed result or with an error, without network. */
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

  override check(): Promise<HealthReport> {
    return this.outcome();
  }
}
