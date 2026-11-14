import {
  NonJsonValueError,
  stableDigest as primitivesStableDigest,
} from '@platform/primitives';
import { queryDigest } from './stable-hash.js';

describe('queryDigest', () => {
  it('is the primitives SHA-256 of the canonical JSON (64 hex characters)', () => {
    const params = { tenant: 't1', filter: { status: 'open', page: 2 } };
    expect(queryDigest(params)).toBe(primitivesStableDigest(params));
    expect(queryDigest(params)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is equal for objects that differ only in key order', () => {
    const first = { tenant: 't1', filter: { status: 'open', page: 2 } };
    const second = { filter: { page: 2, status: 'open' }, tenant: 't1' };
    expect(queryDigest(first)).toBe(queryDigest(second));
  });

  it('keeps a __proto__ key as data instead of collapsing it', () => {
    const withProto = JSON.parse(
      '{"__proto__":{"admin":true},"a":1}',
    ) as unknown;
    const withoutProto = { a: 1 };
    const otherProto = JSON.parse(
      '{"__proto__":{"admin":false},"a":1}',
    ) as unknown;

    expect(queryDigest(withProto)).not.toBe(queryDigest(withoutProto));
    expect(queryDigest(withProto)).not.toBe(queryDigest(otherProto));
    expect(queryDigest(withProto)).toBe(
      queryDigest(JSON.parse('{"a":1,"__proto__":{"admin":true}}')),
    );
  });

  it('keeps a nested __proto__ key as data', () => {
    const nested = JSON.parse('{"f":{"__proto__":{"x":1}}}') as unknown;
    expect(queryDigest(nested)).not.toBe(queryDigest({ f: {} }));
  });

  it('serializes values with toJSON (Date) like JSON.stringify', () => {
    const at = new Date('2026-01-01T00:00:00.000Z');
    expect(queryDigest({ from: at })).toBe(
      queryDigest({ from: '2026-01-01T00:00:00.000Z' }),
    );
  });

  it('rejects values that are not JSON instead of colliding', () => {
    expect(() => queryDigest({ f: () => 1 })).toThrow(NonJsonValueError);
    expect(() => queryDigest({ n: Number.NaN })).toThrow(NonJsonValueError);
    expect(() => queryDigest({ m: new Map() })).toThrow(NonJsonValueError);
    const cyclic: Record<string, unknown> = {};
    cyclic['self'] = cyclic;
    expect(() => queryDigest(cyclic)).toThrow(NonJsonValueError);
  });
});
