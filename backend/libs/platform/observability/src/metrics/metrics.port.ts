import type { MetricAttributes } from './metric-attributes.js';

/**
 * Puerto de métricas. Las librerías de la plataforma publican por aquí sin
 * depender de OpenTelemetry.
 */
export abstract class MetricsPort {
  /** Suma `value` (por defecto 1) a un contador. */
  abstract increment(
    name: string,
    attributes?: MetricAttributes,
    value?: number,
  ): void;

  /** Registra una medición en un histograma (latencias, tamaños). */
  abstract record(
    name: string,
    value: number,
    attributes?: MetricAttributes,
  ): void;
}
