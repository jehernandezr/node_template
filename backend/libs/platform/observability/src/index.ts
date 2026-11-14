// Entrada liviana: solo depende de `@opentelemetry/api` y `@opentelemetry/core`.
// El SDK (exportadores e instrumentaciones) vive en `@platform/observability/setup`.
export * from './lib/trace.js';
export * from './lib/request-context.js';
export * from './lib/redaction.js';
export * from './lib/logger.js';
export * from './lib/sampling.js';
export * from './lib/metrics.js';
export * from './lib/spans.js';
export * from './lib/propagation.js';
