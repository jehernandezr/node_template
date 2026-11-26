import { NoopMetrics } from '../../../metrics/noop-metrics.js';
import { TelemetryHandle } from '../../../telemetry/telemetry-handle.js';

/** SDK-less telemetry that counts shutdowns and flushes, for tests. */
export class FakeTelemetryHandle extends TelemetryHandle {
  readonly metrics = new NoopMetrics();
  forceFlushCalls = 0;
  shutdownCalls = 0;

  constructor(readonly enabled: boolean) {
    super();
  }

  override forceFlush(): Promise<void> {
    this.forceFlushCalls += 1;
    return Promise.resolve();
  }

  override shutdown(): Promise<void> {
    this.shutdownCalls += 1;
    return Promise.resolve();
  }
}
