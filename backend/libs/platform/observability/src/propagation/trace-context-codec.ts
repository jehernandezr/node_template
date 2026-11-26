import type { IdGenerator, RandomSource } from '@platform/kernel';
import { InvalidTraceContextError } from '../errors/invalid-trace-context.error.js';
import type { TraceparentFields } from './traceparent-fields.js';

/**
 * Relation between the platform `traceId` (UUIDv7, ADR 0003) and the
 * W3C/OpenTelemetry trace id: the 128 bits of the UUIDv7 written as 32 lowercase
 * hex are the W3C trace-id. The conversion works both ways. The formatting
 * operations are static; generation uses the injected sources.
 * UUIDs reach support with dashes; they are accepted so they can be normalized.
 */
export class TraceContextCodec {
  /** W3C header that carries the trace. */
  static readonly TRACEPARENT_HEADER = 'traceparent';

  private static readonly TRACE_ID_PATTERN = /^[0-9a-f]{32}$/;
  private static readonly SPAN_ID_PATTERN = /^[0-9a-f]{16}$/;
  private static readonly UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  private static readonly TRACEPARENT_PATTERN =
    /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;
  private static readonly ZERO_TRACE_ID = '0'.repeat(32);
  private static readonly ZERO_SPAN_ID = '0'.repeat(16);
  private static readonly SPAN_ID_BYTES = 8;

  constructor(
    private readonly ids: IdGenerator,
    private readonly random: RandomSource,
  ) {}

  /** UUIDv7 without dashes: a valid W3C trace id. */
  newTraceId(): string {
    return this.ids.next().toString().replace(/-/g, '');
  }

  /** 8 random bytes as 16 lowercase hex. */
  newSpanId(): string {
    return TraceContextCodec.toHex(
      this.random.bytes(TraceContextCodec.SPAN_ID_BYTES),
    );
  }

  /** 32 lowercase hex, not all zeros. */
  static isTraceId(value: unknown): value is string {
    return (
      typeof value === 'string' &&
      TraceContextCodec.TRACE_ID_PATTERN.test(value) &&
      value !== TraceContextCodec.ZERO_TRACE_ID
    );
  }

  /** 16 lowercase hex, not all zeros. */
  static isSpanId(value: unknown): value is string {
    return (
      typeof value === 'string' &&
      TraceContextCodec.SPAN_ID_PATTERN.test(value) &&
      value !== TraceContextCodec.ZERO_SPAN_ID
    );
  }

  /** Converts a trace id (32 hex or dashed UUID, in any case) to 32 hex; `undefined` if invalid. Never throws. */
  static normalizeTraceId(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }
    const lower = value.trim().toLowerCase();
    const compact = TraceContextCodec.UUID_PATTERN.test(lower)
      ? lower.replace(/-/g, '')
      : lower;
    return TraceContextCodec.isTraceId(compact) ? compact : undefined;
  }

  /** Same as `normalizeTraceId` for 16-hex span ids. */
  static normalizeSpanId(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }
    const lower = value.trim().toLowerCase();
    return TraceContextCodec.isSpanId(lower) ? lower : undefined;
  }

  /** Builds a version 00 `traceparent`. Throws `InvalidTraceContextError` if an id is invalid. */
  static formatTraceparent(fields: TraceparentFields): string {
    if (!TraceContextCodec.isTraceId(fields.traceId)) {
      throw new InvalidTraceContextError('trace id of 32 lowercase hex chars');
    }
    if (!TraceContextCodec.isSpanId(fields.spanId)) {
      throw new InvalidTraceContextError('span id of 16 lowercase hex chars');
    }
    return `00-${fields.traceId}-${fields.spanId}-${fields.sampled ? '01' : '00'}`;
  }

  /** Parses a `traceparent`; `null` if missing or invalid. */
  static parseTraceparent(
    header: string | null | undefined,
  ): TraceparentFields | null {
    if (typeof header !== 'string') {
      return null;
    }
    const match = TraceContextCodec.TRACEPARENT_PATTERN.exec(header);
    if (!match) {
      return null;
    }
    const [, traceId, spanId, flags] = match;
    if (
      traceId === TraceContextCodec.ZERO_TRACE_ID ||
      spanId === TraceContextCodec.ZERO_SPAN_ID
    ) {
      return null;
    }
    return {
      traceId,
      spanId,
      sampled: (Number.parseInt(flags, 16) & 0x01) === 0x01,
    };
  }

  /** Formats 32 hex as an 8-4-4-4-12 UUID. Throws `InvalidTraceContextError` if invalid. */
  static toDisplayTraceId(traceId: string): string {
    if (!TraceContextCodec.isTraceId(traceId)) {
      throw new InvalidTraceContextError('trace id of 32 lowercase hex chars');
    }
    return [
      traceId.slice(0, 8),
      traceId.slice(8, 12),
      traceId.slice(12, 16),
      traceId.slice(16, 20),
      traceId.slice(20, 32),
    ].join('-');
  }

  private static toHex(bytes: Uint8Array): string {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
      '',
    );
  }
}
