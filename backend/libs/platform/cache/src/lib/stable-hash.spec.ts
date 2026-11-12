import {
  canonicalJson,
  fnv1a32Hex,
  NonJsonValueError,
  stableDigest as primitivesStableDigest,
} from '@platform/primitives';
import {
  fnv1a32,
  queryDigest,
  stableDigest,
  stableHash,
  stableStringify,
} from './stable-hash.js';

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

describe('stableStringify (deprecated)', () => {
  it('sorts object keys at every nesting level', () => {
    expect(stableStringify({ b: 1, a: { d: 2, c: [{ z: 1, y: 2 }] } })).toBe(
      '{"a":{"c":[{"y":2,"z":1}],"d":2},"b":1}',
    );
  });

  it('keeps array order and drops undefined object members', () => {
    expect(stableStringify({ list: [3, 1, 2], skip: undefined })).toBe(
      '{"list":[3,1,2]}',
    );
  });

  it('serializes undefined as null', () => {
    expect(stableStringify(undefined)).toBe('null');
  });

  it('is the primitives canonical JSON', () => {
    const value = { '10': 1, '2': 2, b: [true, null] };
    expect(stableStringify(value)).toBe(canonicalJson(value));
  });
});

describe('stableDigest (deprecated)', () => {
  it('is equal for objects that differ only in key order', () => {
    const first = { tenant: 't1', filter: { status: 'open', page: 2 } };
    const second = { filter: { page: 2, status: 'open' }, tenant: 't1' };
    expect(stableDigest(first)).toBe(stableDigest(second));
  });

  it('returns the first 32 hex characters of queryDigest', () => {
    expect(stableDigest({ any: 'value' })).toMatch(/^[0-9a-f]{32}$/);
    expect(
      queryDigest({ any: 'value' }).startsWith(stableDigest({ any: 'value' })),
    ).toBe(true);
  });
});

describe('stableHash (deprecated)', () => {
  it('is equal for objects that differ only in key order', () => {
    expect(stableHash({ a: 1, b: 2 })).toBe(stableHash({ b: 2, a: 1 }));
  });

  it('returns 8 lowercase hex characters and differs for different values', () => {
    expect(stableHash({ page: 1 })).toMatch(/^[0-9a-f]{8}$/);
    expect(stableHash({ page: 1 })).not.toBe(stableHash({ page: 2 }));
  });
});

describe('fnv1a32 (deprecated)', () => {
  it('matches the published FNV-1a vectors through primitives', () => {
    expect(fnv1a32('')).toBe('811c9dc5');
    expect(fnv1a32('a')).toBe('e40c292c');
    expect(fnv1a32('foobar')).toBe(fnv1a32Hex('foobar'));
  });
});
