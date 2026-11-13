import {
  metrics,
  type Counter,
  type Histogram,
  type Meter,
} from '@opentelemetry/api';

/** Nombre del instrumentation scope de las métricas de la plataforma. */
export const OTEL_METER_SCOPE = '@platform/observability';

/** Métricas que publica la plataforma. Los servicios pueden agregar las suyas. */
export enum PlatformMetric {
  /** Contador de eventos de resiliencia (reintento, timeout, breaker, bulkhead). */
  ResilienceEvents = 'platform.resilience.events',
  /** Histograma de la espera antes de cada reintento, en milisegundos. */
  ResilienceRetryDelay = 'platform.resilience.retry.delay',
  /** Contador de fallas de caché absorbidas (se leyó de la fuente). */
  CacheErrors = 'platform.cache.errors',
  /** Contador de lecturas de caché por resultado (`hit` o `miss`). */
  CacheLookups = 'platform.cache.lookups',
  /** Contador de errores por código `SERVICIO.SUBMÓDULO.ERROR`. */
  Errors = 'platform.errors',
}

/** Atributos de las métricas de la plataforma. */
export enum MetricAttribute {
  Policy = 'policy',
  Dependency = 'dependency',
  Kind = 'kind',
  ErrorCode = 'error.code',
  ErrorName = 'error.name',
  Cache = 'cache',
  Result = 'result',
}

/** Resultado de una lectura de caché. */
export enum CacheLookupResult {
  Hit = 'hit',
  Miss = 'miss',
}

/** Atributos de una medición. Deben tener cardinalidad baja: nunca ids de usuario ni de tenant. */
export type MetricAttributes = Readonly<
  Record<string, string | number | boolean>
>;

/**
 * Puerto de métricas. Las librerías de la plataforma (resilience, cache,
 * persistence) publican por aquí sin depender de OpenTelemetry.
 */
export interface MetricsPort {
  /** Suma `value` (por defecto 1) a un contador. */
  increment(name: string, attributes?: MetricAttributes, value?: number): void;
  /** Registra una medición en un histograma (latencias, tamaños). */
  record(name: string, value: number, attributes?: MetricAttributes): void;
}

/** Descarta todo. Útil cuando la telemetría está apagada. */
export class NoopMetrics implements MetricsPort {
  increment(): void {
    // sin efecto
  }

  record(): void {
    // sin efecto
  }
}

/** Tipo de instrumento de una medición. */
export enum MeasurementType {
  Counter = 'counter',
  Histogram = 'histogram',
}

/** Una medición guardada por {@link InMemoryMetrics}. */
export interface RecordedMeasurement {
  readonly type: MeasurementType;
  readonly name: string;
  readonly value: number;
  readonly attributes: MetricAttributes;
}

/** Guarda las mediciones en memoria, para pruebas. */
export class InMemoryMetrics implements MetricsPort {
  readonly measurements: RecordedMeasurement[] = [];

  increment(name: string, attributes: MetricAttributes = {}, value = 1): void {
    this.measurements.push({
      type: MeasurementType.Counter,
      name,
      value,
      attributes,
    });
  }

  record(name: string, value: number, attributes: MetricAttributes = {}): void {
    this.measurements.push({
      type: MeasurementType.Histogram,
      name,
      value,
      attributes,
    });
  }

  /** Suma de un contador, opcionalmente filtrando por atributos. */
  total(name: string, where: MetricAttributes = {}): number {
    return this.measurements
      .filter(
        (m) =>
          m.type === MeasurementType.Counter &&
          m.name === name &&
          Object.entries(where).every(([k, v]) => m.attributes[k] === v),
      )
      .reduce((sum, m) => sum + m.value, 0);
  }
}

/**
 * Adaptador de {@link MetricsPort} sobre la API de métricas de OpenTelemetry.
 * Crea cada instrumento una sola vez. Sin SDK registrado, la API es un no-op.
 */
export class OtelMetrics implements MetricsPort {
  private readonly counters = new Map<string, Counter>();
  private readonly histograms = new Map<string, Histogram>();

  constructor(
    private readonly meter: Meter = metrics.getMeter(OTEL_METER_SCOPE),
  ) {}

  increment(name: string, attributes: MetricAttributes = {}, value = 1): void {
    let counter = this.counters.get(name);
    if (counter === undefined) {
      counter = this.meter.createCounter(name);
      this.counters.set(name, counter);
    }
    counter.add(value, attributes);
  }

  record(name: string, value: number, attributes: MetricAttributes = {}): void {
    let histogram = this.histograms.get(name);
    if (histogram === undefined) {
      histogram = this.meter.createHistogram(name);
      this.histograms.set(name, histogram);
    }
    histogram.record(value, attributes);
  }
}

/**
 * Forma estructural de un `ResilienceEvent` de `@platform/resilience`. Se
 * declara aquí para que observability no dependa de resilience.
 */
export interface ResilienceMetricEvent {
  readonly policy: string;
  readonly dependencyKey: string;
  readonly kind: string;
  readonly detail?: {
    readonly attempt?: number;
    readonly delayMs?: number;
    readonly timeoutMs?: number;
    readonly errorCode?: string;
    readonly errorName?: string;
  };
}

/**
 * Listener para `ResilienceRegistry.onEvent`: cuenta cada evento por política,
 * dependencia, tipo y código de error, y registra la espera de los reintentos.
 *
 * ```ts
 * registry.onEvent(resilienceMetricsListener(metrics));
 * ```
 */
export function resilienceMetricsListener(
  port: MetricsPort,
): (event: ResilienceMetricEvent) => void {
  return (event) => {
    const attributes: Record<string, string> = {
      [MetricAttribute.Policy]: event.policy,
      [MetricAttribute.Dependency]: event.dependencyKey,
      [MetricAttribute.Kind]: event.kind,
    };
    const code = event.detail?.errorCode ?? event.detail?.errorName;
    if (code !== undefined) {
      attributes[MetricAttribute.ErrorCode] = code;
    }
    port.increment(PlatformMetric.ResilienceEvents, attributes);
    if (event.detail?.delayMs !== undefined) {
      port.record(PlatformMetric.ResilienceRetryDelay, event.detail.delayMs, {
        [MetricAttribute.Policy]: event.policy,
        [MetricAttribute.Dependency]: event.dependencyKey,
      });
    }
  };
}

const MAX_ERROR_LABEL_LENGTH = 128;

/**
 * Atributos de baja cardinalidad para un error: su `code` si es texto (por
 * ejemplo `PLATFORM.CACHE.TIMEOUT` o `ECONNRESET`) y su `name`. Nunca usa el
 * mensaje, que puede llevar datos.
 */
export function errorMetricAttributes(error: unknown): MetricAttributes {
  if (typeof error !== 'object' || error === null) {
    return { [MetricAttribute.ErrorName]: typeof error };
  }
  const attributes: Record<string, string> = {};
  const code = (error as { code?: unknown }).code;
  if (typeof code === 'string' && code.length > 0) {
    attributes[MetricAttribute.ErrorCode] = code.slice(
      0,
      MAX_ERROR_LABEL_LENGTH,
    );
  }
  const name = (error as { name?: unknown }).name;
  attributes[MetricAttribute.ErrorName] =
    typeof name === 'string' && name.length > 0
      ? name.slice(0, MAX_ERROR_LABEL_LENGTH)
      : 'Object';
  return attributes;
}

/**
 * Función para `CacheAsideOptions.onError`: cuenta cada falla de caché
 * absorbida por código de error.
 *
 * ```ts
 * new CacheAside(cache, { onError: cacheErrorMetricsReporter(metrics, 'orders') });
 * ```
 */
export function cacheErrorMetricsReporter(
  port: MetricsPort,
  cacheName?: string,
): (error: unknown) => void {
  return (error) => {
    port.increment(PlatformMetric.CacheErrors, {
      ...errorMetricAttributes(error),
      ...(cacheName !== undefined && { [MetricAttribute.Cache]: cacheName }),
    });
  };
}

/** Cuenta una lectura de caché como acierto o fallo. */
export function recordCacheLookup(
  port: MetricsPort,
  result: CacheLookupResult,
  cacheName?: string,
): void {
  port.increment(PlatformMetric.CacheLookups, {
    [MetricAttribute.Result]: result,
    ...(cacheName !== undefined && { [MetricAttribute.Cache]: cacheName }),
  });
}

/** Cuenta un error por su código (métrica "errores por código" del plan). */
export function recordError(port: MetricsPort, error: unknown): void {
  port.increment(PlatformMetric.Errors, errorMetricAttributes(error));
}
