import {
  canonicalJson,
  MAX_IDEMPOTENCY_KEY_LENGTH,
} from '@platform/primitives';

/** Longest idempotency key a caller may send. */
export const MAX_CALL_IDEMPOTENCY_KEY_LENGTH = 256;

/** Longest tenant id accepted as a segment of the idempotency key. */
export const MAX_TENANT_ID_LENGTH = 128;

/** Default limit of a serialized input or output, in bytes. */
export const DEFAULT_MAX_PAYLOAD_BYTES = 256 * 1024;

/** Segments that scope an idempotency key on the server. */
export interface IdempotencyKeySegments {
  readonly tenantId?: string;
  readonly operationId: string;
  readonly idempotencyKey: string;
}

/**
 * Store key of a call: the canonical JSON array `[tenantId, operationId, key]`
 * (a missing tenant is `null`). The JSON encoding escapes every segment, so no
 * value can collide with another split, unlike a `|`-joined string.
 */
export function operationIdempotencyKey(
  segments: IdempotencyKeySegments,
): string {
  return canonicalJson([
    segments.tenantId ?? null,
    segments.operationId,
    segments.idempotencyKey,
  ]);
}

/** Whether the caller-provided key and tenant are within bounds. */
export function isValidCallKey(
  idempotencyKey: unknown,
  tenantId: unknown,
): boolean {
  if (
    typeof idempotencyKey !== 'string' ||
    idempotencyKey.trim() === '' ||
    idempotencyKey.length > MAX_CALL_IDEMPOTENCY_KEY_LENGTH
  ) {
    return false;
  }
  return (
    tenantId === undefined ||
    (typeof tenantId === 'string' &&
      tenantId !== '' &&
      tenantId.length <= MAX_TENANT_ID_LENGTH)
  );
}

/** Whether an encoded store key fits the idempotency store. */
export function fitsIdempotencyStore(key: string): boolean {
  return key.length <= MAX_IDEMPOTENCY_KEY_LENGTH;
}

/**
 * Size in bytes of the JSON text of `value`, or `undefined` when it cannot be
 * serialized (cycles, bigint). `undefined` itself counts as zero bytes.
 */
export function jsonByteLength(value: unknown): number | undefined {
  try {
    const text = JSON.stringify(value);
    return text === undefined ? 0 : Buffer.byteLength(text, 'utf8');
  } catch {
    return undefined;
  }
}

/** Whether `value` serializes within `maxBytes`. */
export function fitsPayload(value: unknown, maxBytes: number): boolean {
  const size = jsonByteLength(value);
  return size !== undefined && size <= maxBytes;
}
