import {
  HealthCheckable,
  HealthState,
  type HealthReport,
} from '@platform/kernel';

/** Dependency that stores the received signal, to check that it is propagated. */
export class SignalRecordingHealthCheck extends HealthCheckable {
  received?: AbortSignal;

  constructor(readonly name: string) {
    super();
  }

  override check(signal?: AbortSignal): Promise<HealthReport> {
    this.received = signal;
    return Promise.resolve({ state: HealthState.Up });
  }
}
