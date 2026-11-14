import type { IdGenerator as OtelIdGenerator } from '@opentelemetry/sdk-trace';
import type { TraceContextCodec } from '../propagation/trace-context-codec.js';

/**
 * Generador de ids de OpenTelemetry que usa UUIDv7 para el trace id (ADR 0003):
 * la traza que abre la plataforma tiene el mismo `traceId` que devuelve `x-trace-id`.
 */
export class UuidV7TraceIdGenerator implements OtelIdGenerator {
  constructor(private readonly codec: TraceContextCodec) {}

  generateTraceId(): string {
    return this.codec.newTraceId();
  }

  generateSpanId(): string {
    return this.codec.newSpanId();
  }
}
