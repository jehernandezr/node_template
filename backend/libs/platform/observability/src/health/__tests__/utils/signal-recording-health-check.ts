import {
  HealthCheckable,
  HealthState,
  type HealthReport,
} from '@platform/kernel';

/** Dependencia que guarda la señal recibida, para comprobar que la propagan. */
export class SignalRecordingHealthCheck extends HealthCheckable {
  received?: AbortSignal;

  constructor(readonly name: string) {
    super();
  }

  check(signal?: AbortSignal): Promise<HealthReport> {
    this.received = signal;
    return Promise.resolve({ state: HealthState.Up });
  }
}
