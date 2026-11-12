import { stableDigest } from '@platform/primitives';
import { hashInput } from './input-hash.js';
import {
  fitsPayload,
  isValidCallKey,
  jsonByteLength,
  MAX_CALL_IDEMPOTENCY_KEY_LENGTH,
  MAX_TENANT_ID_LENGTH,
  operationIdempotencyKey,
} from './limits.js';

describe('operationIdempotencyKey', () => {
  it('encodes tenant, operation and key as a canonical JSON array', () => {
    expect(
      operationIdempotencyKey({
        tenantId: 't-1',
        operationId: 'a.b.v1',
        idempotencyKey: 'k',
      }),
    ).toBe('["t-1","a.b.v1","k"]');
    expect(
      operationIdempotencyKey({ operationId: 'a.b.v1', idempotencyKey: 'k' }),
    ).toBe('[null,"a.b.v1","k"]');
  });

  it('cannot be forged by moving a delimiter between segments', () => {
    const a = operationIdempotencyKey({
      tenantId: 'x|a.b.v1',
      operationId: 'a.b.v1',
      idempotencyKey: 'k',
    });
    const b = operationIdempotencyKey({
      tenantId: 'x',
      operationId: 'a.b.v1',
      idempotencyKey: 'a.b.v1|k',
    });
    const c = operationIdempotencyKey({
      tenantId: 'x","a.b.v1',
      operationId: 'a.b.v1',
      idempotencyKey: 'k',
    });
    expect(new Set([a, b, c]).size).toBe(3);
  });

  it('keeps a missing tenant apart from a tenant named "null"', () => {
    expect(
      operationIdempotencyKey({ operationId: 'a.b.v1', idempotencyKey: 'k' }),
    ).not.toBe(
      operationIdempotencyKey({
        tenantId: 'null',
        operationId: 'a.b.v1',
        idempotencyKey: 'k',
      }),
    );
  });
});

describe('isValidCallKey', () => {
  it('bounds the key and the tenant', () => {
    expect(isValidCallKey('k', undefined)).toBe(true);
    expect(isValidCallKey('k', 't')).toBe(true);
    expect(isValidCallKey('', undefined)).toBe(false);
    expect(isValidCallKey(' ', undefined)).toBe(false);
    expect(isValidCallKey(undefined, undefined)).toBe(false);
    expect(
      isValidCallKey('k'.repeat(MAX_CALL_IDEMPOTENCY_KEY_LENGTH), undefined),
    ).toBe(true);
    expect(
      isValidCallKey(
        'k'.repeat(MAX_CALL_IDEMPOTENCY_KEY_LENGTH + 1),
        undefined,
      ),
    ).toBe(false);
    expect(isValidCallKey('k', '')).toBe(false);
    expect(isValidCallKey('k', 't'.repeat(MAX_TENANT_ID_LENGTH + 1))).toBe(
      false,
    );
  });
});

describe('payload size', () => {
  it('measures UTF-8 bytes of the JSON text', () => {
    expect(jsonByteLength({ a: 'ñ' })).toBe('{"a":"ñ"}'.length + 1);
    expect(jsonByteLength(undefined)).toBe(0);
    expect(jsonByteLength({ big: BigInt(1) })).toBeUndefined();
  });

  it('accepts a payload up to the limit and rejects unserializable values', () => {
    expect(fitsPayload({ a: 1 }, 7)).toBe(true);
    expect(fitsPayload({ a: 1 }, 6)).toBe(false);
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    expect(fitsPayload(cycle, 1_000)).toBe(false);
  });
});

describe('hashInput', () => {
  it('is the stable digest, so a __proto__ key does not collapse the hash', () => {
    const withProto = JSON.parse('{"__proto__":{"admin":true}}') as unknown;
    expect(hashInput(withProto)).toBe(stableDigest(withProto));
    expect(hashInput(withProto)).not.toBe(hashInput({}));
    expect(hashInput({ b: 1, a: 2 })).toBe(hashInput({ a: 2, b: 1 }));
    expect(hashInput(undefined)).toBe(stableDigest(null));
  });
});
