// Entrada liviana: solo depende de `@opentelemetry/api` y `@opentelemetry/core`.
// El SDK (exportadores e instrumentaciones) vive en `@platform/observability/setup`.
export * from './trace.js';
export * from './request-context.js';
export * from './redaction.js';
export * from './logger.js';
export * from './sampling.js';
export * from './metrics.js';
export * from './spans.js';
export * from './propagation.js';
