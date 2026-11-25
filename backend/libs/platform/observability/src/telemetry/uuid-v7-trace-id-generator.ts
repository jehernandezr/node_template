import type { IdGenerator as OtelIdGenerator } from '@opentelemetry/sdk-trace';
import type { TraceContextCodec } from '../propagation/trace-context-codec.js';

/**
 * OpenTelemetry id generator that uses UUIDv7 for the trace id (ADR 0003):
 * the trace opened by the platform has the same `traceId` that `x-trace-id` returns.
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
