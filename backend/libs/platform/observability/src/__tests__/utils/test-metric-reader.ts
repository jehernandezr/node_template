import { MetricReader } from '@opentelemetry/sdk-metrics';

/** Lector de métricas en memoria: `collect()` devuelve lo registrado sin exportar nada. */
export class TestMetricReader extends MetricReader {
  protected onShutdown(): Promise<void> {
    return Promise.resolve();
  }

  protected onForceFlush(): Promise<void> {
    return Promise.resolve();
  }
}
