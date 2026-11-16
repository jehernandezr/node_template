// Arranque temprano del SDK de OpenTelemetry. Se importa solo en el punto de
// entrada de cada servicio, porque carga exportadores e instrumentaciones.
export * from './telemetry/external-trace-id-span-processor.js';
export * from './telemetry/iovalkey-instrumentation.js';
export * from './telemetry/otlp-path.enum.js';
export * from './telemetry/otlp-url.js';
export * from './telemetry/telemetry-bootstrap.js';
export * from './telemetry/telemetry-instrumentation.enum.js';
export * from './telemetry/telemetry-options.js';
export * from './telemetry/uuid-v7-trace-id-generator.js';
export * from './config/telemetry-options.reader.js';
