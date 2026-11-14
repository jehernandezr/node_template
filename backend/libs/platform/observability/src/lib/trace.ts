import { randomBytes } from 'node:crypto';
import { UuidV7IdGenerator, type IdGenerator } from '@platform/kernel';

/**
 * Relación entre el `traceId` del plan y el trace id de W3C/OpenTelemetry.
 *
 * El `traceId` es un UUIDv7 (ADR 0003). Sus 128 bits, escritos como 32
 * caracteres hexadecimales en minúscula y sin guiones, son exactamente el
 * trace-id de W3C que usan `traceparent`, OpenTelemetry y X-Ray:
 *
 *   UUIDv7   0193f1c2-7a4b-7c3d-8e5f-0123456789ab
 *   trace_id 0193f1c27a4b7c3d8e5f0123456789ab
 *
 * La conversión no pierde información y va en los dos sentidos
 * (`normalizeTraceId` y `toDisplayTraceId`). Dentro de la plataforma el valor
 * canónico es el de 32 hex: es el que llevan los spans, los logs (`trace_id`)
 * y los headers. La forma con guiones es solo para personas.
 */
const TRACE_ID_PATTERN = /^[0-9a-f]{32}$/;
const SPAN_ID_PATTERN = /^[0-9a-f]{16}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const TRACEPARENT_PATTERN = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;
const ZERO_TRACE_ID = '0'.repeat(32);
const ZERO_SPAN_ID = '0'.repeat(16);

export interface TraceparentFields {
  traceId: string;
  spanId: string;
  sampled: boolean;
}

/** Indica si `value` es un trace id W3C válido: 32 hex en minúscula, no todo ceros. */
export function isTraceId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    TRACE_ID_PATTERN.test(value) &&
    value !== ZERO_TRACE_ID
  );
}

/** Indica si `value` es un span id W3C válido: 16 hex en minúscula, no todo ceros. */
export function isSpanId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    SPAN_ID_PATTERN.test(value) &&
    value !== ZERO_SPAN_ID
  );
}

/**
 * Lleva un trace id a su forma canónica de 32 hex en minúscula. Acepta esa
 * misma forma o un UUID con guiones (el formato que se muestra a soporte), en
 * mayúsculas o minúsculas. Devuelve `undefined` si el valor no es válido; nunca
 * lanza, porque el valor puede venir de un header externo.
 */
export function normalizeTraceId(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const lower = value.trim().toLowerCase();
  const compact = UUID_PATTERN.test(lower) ? lower.replace(/-/g, '') : lower;
  return isTraceId(compact) ? compact : undefined;
}

/** Igual que {@link normalizeTraceId} para span ids de 16 hex. */
export function normalizeSpanId(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const lower = value.trim().toLowerCase();
  return isSpanId(lower) ? lower : undefined;
}

/**
 * Genera un trace id: un UUIDv7 sin guiones (32 hex en minúscula), que es un
 * trace-id W3C válido.
 */
export function newTraceId(ids: IdGenerator = new UuidV7IdGenerator()): string {
  return ids.next().toString().replace(/-/g, '');
}

/** Genera un span id W3C: 8 bytes aleatorios como 16 hex en minúscula. */
export function newSpanId(): string {
  return randomBytes(8).toString('hex');
}

/**
 * Arma un header W3C `traceparent` (versión 00). Lanza `RangeError` si un id
 * no es válido; el mensaje no repite el valor recibido.
 */
export function formatTraceparent(fields: TraceparentFields): string {
  if (!isTraceId(fields.traceId)) {
    throw new RangeError('Invalid trace id: expected 32 lowercase hex chars');
  }
  if (!isSpanId(fields.spanId)) {
    throw new RangeError('Invalid span id: expected 16 lowercase hex chars');
  }
  return `00-${fields.traceId}-${fields.spanId}-${fields.sampled ? '01' : '00'}`;
}

/**
 * Lee un header W3C `traceparent`. Devuelve `null` si falta o no es válido
 * (otra versión, largos incorrectos, caracteres no hex o ids en cero).
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

/**
 * Escribe un trace id de 32 hex como UUID 8-4-4-4-12 para personas y
 * herramientas de soporte. Lanza `RangeError` sin repetir el valor recibido.
 */
export function toDisplayTraceId(traceId: string): string {
  if (!isTraceId(traceId)) {
    throw new RangeError('Invalid trace id: expected 32 lowercase hex chars');
  }
  return [
    traceId.slice(0, 8),
    traceId.slice(8, 12),
    traceId.slice(12, 16),
    traceId.slice(16, 20),
    traceId.slice(20, 32),
  ].join('-');
}
