import { MetricReader } from '@opentelemetry/sdk-metrics';

/** In-memory metric reader: `collect()` returns what was recorded without exporting anything. */
export class TestMetricReader extends MetricReader {
  protected onShutdown(): Promise<void> {
    return Promise.resolve();
  }

  protected onForceFlush(): Promise<void> {
    return Promise.resolve();
  }
}
