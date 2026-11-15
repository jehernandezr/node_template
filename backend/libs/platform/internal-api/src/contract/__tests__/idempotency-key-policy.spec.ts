import { IdempotencyKeyPolicy } from '../idempotency-key-policy.js';

describe('IdempotencyKeyPolicy', () => {
  describe('storeKey', () => {
    it('encodes tenant, operation and key as a canonical JSON array', () => {
      expect(
        IdempotencyKeyPolicy.storeKey({
          tenantId: 't-1',
          operationId: 'a.b.v1',
          idempotencyKey: 'k',
        }),
      ).toBe('["t-1","a.b.v1","k"]');
      expect(
        IdempotencyKeyPolicy.storeKey({
          operationId: 'a.b.v1',
          idempotencyKey: 'k',
        }),
      ).toBe('[null,"a.b.v1","k"]');
    });

    it('cannot be forged by moving a delimiter between segments', () => {
      const keys = [
        { tenantId: 'x|a.b.v1', idempotencyKey: 'k' },
        { tenantId: 'x', idempotencyKey: 'a.b.v1|k' },
        { tenantId: 'x","a.b.v1', idempotencyKey: 'k' },
      ].map((segments) =>
        IdempotencyKeyPolicy.storeKey({ operationId: 'a.b.v1', ...segments }),
      );

      expect(new Set(keys).size).toBe(3);
    });

    it('keeps a missing tenant apart from a tenant named "null"', () => {
      expect(
        IdempotencyKeyPolicy.storeKey({
          operationId: 'a.b.v1',
          idempotencyKey: 'k',
        }),
      ).not.toBe(
        IdempotencyKeyPolicy.storeKey({
          tenantId: 'null',
          operationId: 'a.b.v1',
          idempotencyKey: 'k',
        }),
      );
    });
  });

  describe('isValid', () => {
    it.each([
      ['a key without tenant', 'k', undefined, true],
      ['a key with tenant', 'k', 't', true],
      ['an empty key', '', undefined, false],
      ['a blank key', ' ', undefined, false],
      ['a missing key', undefined, undefined, false],
      [
        'a key at the maximum length',
        'k'.repeat(IdempotencyKeyPolicy.MAX_CALL_KEY_LENGTH),
        undefined,
        true,
      ],
      [
        'a key over the maximum length',
        'k'.repeat(IdempotencyKeyPolicy.MAX_CALL_KEY_LENGTH + 1),
        undefined,
        false,
      ],
      ['an empty tenant', 'k', '', false],
      [
        'a tenant over the maximum length',
        'k',
        't'.repeat(IdempotencyKeyPolicy.MAX_TENANT_ID_LENGTH + 1),
        false,
      ],
    ])('judges %s', (_label, key, tenant, expected) => {
      expect(IdempotencyKeyPolicy.isValid(key, tenant)).toBe(expected);
    });
  });

  describe('fitsStore', () => {
    it('accepts a store key within the limit and rejects a longer one', () => {
      expect(IdempotencyKeyPolicy.fitsStore('k'.repeat(512))).toBe(true);
      expect(IdempotencyKeyPolicy.fitsStore('k'.repeat(513))).toBe(false);
    });
  });
});
