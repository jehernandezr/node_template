import {
  fnv1a32,
  stableDigest,
  stableHash,
  stableStringify,
} from './stable-hash.js';

describe('stableStringify', () => {
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
});

describe('stableDigest', () => {
  it('is equal for objects that differ only in key order', () => {
    const first = { tenant: 't1', filter: { status: 'open', page: 2 } };
    const second = { filter: { page: 2, status: 'open' }, tenant: 't1' };
    expect(stableDigest(first)).toBe(stableDigest(second));
  });

  it('returns 32 lowercase hex characters', () => {
    expect(stableDigest({ any: 'value' })).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe('stableHash', () => {
  it('is equal for objects that differ only in key order', () => {
    expect(stableHash({ a: 1, b: 2 })).toBe(stableHash({ b: 2, a: 1 }));
  });

  it('returns 8 lowercase hex characters and differs for different values', () => {
    expect(stableHash({ page: 1 })).toMatch(/^[0-9a-f]{8}$/);
    expect(stableHash({ page: 1 })).not.toBe(stableHash({ page: 2 }));
  });
});

describe('fnv1a32', () => {
  it('matches the published FNV-1a vectors', () => {
    expect(fnv1a32('')).toBe('811c9dc5');
    expect(fnv1a32('a')).toBe('e40c292c');
  });
});
