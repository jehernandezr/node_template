// Entrada liviana: depende de `@opentelemetry/api`, `@opentelemetry/core` y
// `@platform/config` (solo para las secciones de configuración). El SDK
// (exportadores e instrumentaciones) vive en `@platform/observability/setup` y
// el cableado de NestJS en `@platform/observability/nest`.
export * from './config/logging.config.js';
export * from './config/telemetry.config.js';
export * from './context/active-span-ids.js';
export * from './context/actor-type.enum.js';
export * from './context/request-context-data.js';
export * from './context/request-context-init.js';
export * from './context/request-context-store.js';
export * from './errors/duplicate-health-check.error.js';
export * from './errors/invalid-trace-context.error.js';
export * from './errors/observability-error-catalog.js';
export * from './errors/observability-error-code.enum.js';
export * from './health/health-registry.js';
export * from './health/health-summary.js';
export * from './logging/debug-sampler.js';
export * from './logging/log-field.enum.js';
export * from './logging/log-level.enum.js';
export * from './logging/log-record.js';
export * from './logging/log-sink.js';
export * from './logging/logger.port.js';
export * from './logging/otlp-log-sink.js';
export * from './logging/stdout-log-sink.js';
export * from './logging/structured-logger.js';
export * from './logging/structured-logger.options.js';
export * from './metrics/error-metric-attributes.js';
export * from './metrics/error-metrics.js';
export * from './metrics/metric-attribute.enum.js';
export * from './metrics/metric-attributes.js';
export * from './metrics/metrics.port.js';
export * from './metrics/noop-metrics.js';
export * from './metrics/otel-metrics.js';
export * from './metrics/platform-metric.enum.js';
export * from './propagation/external-traceparent-propagator-options.js';
export * from './propagation/external-traceparent-propagator.js';
export * from './propagation/incoming-traceparent-policy.enum.js';
export * from './propagation/trace-context-codec.js';
export * from './propagation/trace-context-restorer.js';
export * from './propagation/traceparent-fields.js';
export * from './redaction/redaction-rules.js';
export * from './redaction/redaction-word-lists.js';
export * from './redaction/redactor.js';
export * from './telemetry/telemetry-handle.js';
export * from './tracing/span-attribute.enum.js';
export * from './tracing/tracing.js';
export * from './tracing/with-span-options.js';
