import { NonJsonValueError } from '../../errors/non-json-value.error.js';
import { CanonicalJson } from '../canonical-json.js';

describe('CanonicalJson', () => {
  it('sorts keys at every level and drops undefined properties', () => {
    expect(
      CanonicalJson.stringify({
        b: 1,
        a: { d: [3, { z: 1, y: 2 }], c: undefined },
      }),
    ).toBe('{"a":{"d":[3,{"y":2,"z":1}]},"b":1}');
  });

  it('orders index-like keys by UTF-16 code unit, not numerically', () => {
    expect(CanonicalJson.stringify({ 10: 'a', 2: 'b' })).toBe(
      '{"10":"a","2":"b"}',
    );
  });

  it('gives the same text and digest regardless of insertion order', () => {
    expect(CanonicalJson.digest({ a: 1, b: 2 })).toBe(
      CanonicalJson.digest({ b: 2, a: 1 }),
    );
    expect(CanonicalJson.digest({ a: 1 })).toMatch(/^[0-9a-f]{64}$/);
    expect(CanonicalJson.digest({ a: 1 })).not.toBe(
      CanonicalJson.digest({ a: 2 }),
    );
  });

  it('normalizes negative zero and keeps scalars', () => {
    expect(CanonicalJson.stringify(-0)).toBe('0');
    expect(CanonicalJson.stringify([null, true, 'x', 1.5])).toBe(
      '[null,true,"x",1.5]',
    );
  });

  it('keeps a __proto__ key as plain data', () => {
    const value = JSON.parse('{"__proto__":{"x":1}}') as unknown;
    expect(CanonicalJson.stringify(value)).toBe('{"__proto__":{"x":1}}');
  });

  it.each([
    ['undefined', undefined, '$'],
    ['function', () => 1, '$'],
    ['symbol', Symbol('s'), '$'],
    ['bigint', 1n, '$'],
    ['NaN', NaN, '$'],
    ['Infinity', Infinity, '$'],
    ['Date', { when: new Date(0) }, '$.when'],
    ['Map', { m: new Map() }, '$.m'],
    [
      'sparse array',
      Object.assign(new Array<number>(3), { 0: 1, 2: 3 }),
      '$[1]',
    ],
    ['nested path', { items: [{ 'a-b': undefined, c: 1n }] }, '$.items[0].c'],
    ['quoted key path', { 'a-b': 1n }, '$["a-b"]'],
  ])('rejects %s with the path of the value', (_label, value, path) => {
    try {
      CanonicalJson.canonicalize(value);
      throw new Error('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(NonJsonValueError);
      expect((error as NonJsonValueError).details).toMatchObject({ path });
    }
  });

  it('rejects cycles', () => {
    const cycle: Record<string, unknown> = {};
    cycle['self'] = cycle;
    expect(() => CanonicalJson.canonicalize(cycle)).toThrow(/circular/);
  });

  it('accepts a repeated reference that is not a cycle', () => {
    const shared = { a: 1 };
    expect(CanonicalJson.stringify([shared, shared])).toBe('[{"a":1},{"a":1}]');
  });

  it('rejects nesting deeper than MAX_DEPTH', () => {
    let value: unknown = 1;
    for (let level = 0; level <= CanonicalJson.MAX_DEPTH; level += 1) {
      value = [value];
    }
    expect(() => CanonicalJson.canonicalize(value)).toThrow(/nesting/);
  });

  it('accepts nesting exactly at MAX_DEPTH', () => {
    let value: unknown = 1;
    for (let level = 0; level < CanonicalJson.MAX_DEPTH; level += 1) {
      value = [value];
    }
    expect(() => CanonicalJson.canonicalize(value)).not.toThrow();
  });
});
