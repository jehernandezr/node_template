import type { IdGenerator, RandomSource } from '@platform/kernel';
import { InvalidTraceContextError } from '../errors/invalid-trace-context.error.js';
import type { TraceparentFields } from './traceparent-fields.js';

/**
 * Relación entre el `traceId` de la plataforma (UUIDv7, ADR 0003) y el trace id
 * de W3C/OpenTelemetry: los 128 bits del UUIDv7 escritos como 32 hex en
 * minúscula son el trace-id W3C. La conversión va en los dos sentidos. Las
 * operaciones de formato son estáticas; la generación usa las fuentes inyectadas.
 */
export class TraceContextCodec {
  /** Header W3C que lleva la traza. */
  static readonly TRACEPARENT_HEADER = 'traceparent';

  private static readonly TRACE_ID_PATTERN = /^[0-9a-f]{32}$/;
  private static readonly SPAN_ID_PATTERN = /^[0-9a-f]{16}$/;
  /* Los UUID llegan a soporte con guiones; se aceptan para normalizarlos. */
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

  /** UUIDv7 sin guiones: un trace id W3C válido. */
  newTraceId(): string {
    return this.ids.next().toString().replace(/-/g, '');
  }

  /** 8 bytes aleatorios como 16 hex en minúscula. */
  newSpanId(): string {
    return TraceContextCodec.toHex(
      this.random.bytes(TraceContextCodec.SPAN_ID_BYTES),
    );
  }

  /** 32 hex en minúscula y no todo ceros. */
  static isTraceId(value: unknown): value is string {
    return (
      typeof value === 'string' &&
      TraceContextCodec.TRACE_ID_PATTERN.test(value) &&
      value !== TraceContextCodec.ZERO_TRACE_ID
    );
  }

  /** 16 hex en minúscula y no todo ceros. */
  static isSpanId(value: unknown): value is string {
    return (
      typeof value === 'string' &&
      TraceContextCodec.SPAN_ID_PATTERN.test(value) &&
      value !== TraceContextCodec.ZERO_SPAN_ID
    );
  }

  /** Lleva un trace id (32 hex o UUID con guiones, en cualquier caja) a 32 hex; `undefined` si no es válido. Nunca lanza. */
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

  /** Igual que `normalizeTraceId` para span ids de 16 hex. */
  static normalizeSpanId(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }
    const lower = value.trim().toLowerCase();
    return TraceContextCodec.isSpanId(lower) ? lower : undefined;
  }

  /** Arma un `traceparent` versión 00. Lanza `InvalidTraceContextError` si un id no es válido. */
  static formatTraceparent(fields: TraceparentFields): string {
    if (!TraceContextCodec.isTraceId(fields.traceId)) {
      throw new InvalidTraceContextError('trace id of 32 lowercase hex chars');
    }
    if (!TraceContextCodec.isSpanId(fields.spanId)) {
      throw new InvalidTraceContextError('span id of 16 lowercase hex chars');
    }
    return `00-${fields.traceId}-${fields.spanId}-${fields.sampled ? '01' : '00'}`;
  }

  /** Lee un `traceparent`; `null` si falta o no es válido. */
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

  /** 32 hex como UUID 8-4-4-4-12. Lanza `InvalidTraceContextError` si no es válido. */
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
