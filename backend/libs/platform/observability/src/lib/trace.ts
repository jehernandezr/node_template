import { randomBytes } from 'node:crypto';
import { UuidV7IdGenerator, type IdGenerator } from '@platform/kernel';

const TRACE_ID_PATTERN = /^[0-9a-f]{32}$/;
const SPAN_ID_PATTERN = /^[0-9a-f]{16}$/;
const TRACEPARENT_PATTERN = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;
const ZERO_TRACE_ID = '0'.repeat(32);
const ZERO_SPAN_ID = '0'.repeat(16);

export interface TraceparentFields {
  traceId: string;
  spanId: string;
  sampled: boolean;
}

/**
 * Generates a trace id: a UUIDv7 without hyphens (32 lowercase hex chars),
 * which is a valid W3C trace-id.
 */
export function newTraceId(ids: IdGenerator = new UuidV7IdGenerator()): string {
  return ids.next().toString().replace(/-/g, '');
}

/** Generates a W3C span id: 8 random bytes as 16 lowercase hex chars. */
export function newSpanId(): string {
  return randomBytes(8).toString('hex');
}

/** Builds a W3C `traceparent` header (version 00). */
export function formatTraceparent(fields: TraceparentFields): string {
  if (!TRACE_ID_PATTERN.test(fields.traceId)) {
    throw new RangeError(`Invalid trace id: ${fields.traceId}`);
  }
  if (!SPAN_ID_PATTERN.test(fields.spanId)) {
    throw new RangeError(`Invalid span id: ${fields.spanId}`);
  }
  return `00-${fields.traceId}-${fields.spanId}-${fields.sampled ? '01' : '00'}`;
}

/**
 * Parses a W3C `traceparent` header. Returns `null` when the header is
 * missing or invalid (wrong version, bad lengths, non-hex or all-zero ids).
 */
export function parseTraceparent(
  header: string | null | undefined,
): TraceparentFields | null {
  if (typeof header !== 'string') {
    return null;
  }
  const match = TRACEPARENT_PATTERN.exec(header);
  if (!match) {
    return null;
  }
  const [, traceId, spanId, flags] = match;
  if (traceId === ZERO_TRACE_ID || spanId === ZERO_SPAN_ID) {
    return null;
  }
  return {
    traceId,
    spanId,
    sampled: (Number.parseInt(flags, 16) & 0x01) === 0x01,
  };
}

/** Formats a 32-hex trace id as 8-4-4-4-12 for humans and support tooling. */
export function toDisplayTraceId(traceId: string): string {
  if (!TRACE_ID_PATTERN.test(traceId)) {
    throw new RangeError(`Invalid trace id: ${traceId}`);
  }
  return [
    traceId.slice(0, 8),
    traceId.slice(8, 12),
    traceId.slice(12, 16),
    traceId.slice(16, 20),
    traceId.slice(20, 32),
  ].join('-');
}
