import { createHash } from 'node:crypto';
import { NonJsonValueError } from '../../errors/non-json-value.error.js';
import { PrimitivesErrorCode } from '../../errors/primitives-error-code.enum.js';
import { CanonicalJson } from '../canonical-json.js';

describe('CanonicalJson legacy cases', () => {
  it('serializes primitives like JSON', () => {
    expect(CanonicalJson.stringify(null)).toBe('null');
    expect(CanonicalJson.stringify(true)).toBe('true');
    expect(CanonicalJson.stringify(1.5)).toBe('1.5');
    expect(CanonicalJson.stringify('a"b\n')).toBe('"a\\"b\\n"');
    expect(CanonicalJson.stringify(-0)).toBe('0');
    expect(CanonicalJson.stringify(1e21)).toBe('1e+21');
  });

  it('sorts keys at every level, regardless of insertion order', () => {
    const a = { b: 1, a: { d: [{ z: 1, y: 2 }], c: null } };
    const b = { a: { c: null, d: [{ y: 2, z: 1 }] }, b: 1 };
    expect(CanonicalJson.stringify(a)).toBe(
      '{"a":{"c":null,"d":[{"y":2,"z":1}]},"b":1}',
    );
    expect(CanonicalJson.stringify(a)).toBe(CanonicalJson.stringify(b));
  });

  it('keeps array order', () => {
    expect(CanonicalJson.stringify([3, 1, 2])).toBe('[3,1,2]');
    expect(CanonicalJson.stringify([3, 1, 2])).not.toBe(
      CanonicalJson.stringify([1, 2, 3]),
    );
  });

  it('orders index-like keys by UTF-16 code unit, not numerically', () => {
    expect(CanonicalJson.stringify({ 10: 'a', 9: 'b', 1: 'c', x: 'd' })).toBe(
      '{"1":"c","10":"a","9":"b","x":"d"}',
    );
  });

  it('orders keys by code unit, so uppercase sorts before lowercase', () => {
    expect(CanonicalJson.stringify({ b: 1, B: 2, á: 3, a: 4 })).toBe(
      '{"B":2,"a":4,"b":1,"á":3}',
    );
  });

  it('omits undefined properties, like JSON.stringify', () => {
    expect(CanonicalJson.stringify({ a: 1, b: undefined })).toBe('{"a":1}');
    expect(CanonicalJson.stringify({ a: 1, b: undefined })).toBe(
      CanonicalJson.stringify({ a: 1 }),
    );
  });

  it('accepts objects without prototype', () => {
    const bare = Object.create(null) as Record<string, unknown>;
    bare['k'] = 'v';
    expect(CanonicalJson.stringify(bare)).toBe('{"k":"v"}');
  });

  it('allows the same object twice when it is not a cycle', () => {
    const shared = { x: 1 };
    expect(CanonicalJson.stringify({ a: shared, b: [shared] })).toBe(
      '{"a":{"x":1},"b":[{"x":1}]}',
    );
  });

  describe('prototype-polluting keys', () => {
    it('keeps __proto__ as data instead of changing the prototype', () => {
      const parsed = JSON.parse(
        '{"__proto__":{"admin":true},"a":1}',
      ) as unknown;
      expect(CanonicalJson.stringify(parsed)).toBe(
        '{"__proto__":{"admin":true},"a":1}',
      );
      expect(CanonicalJson.stringify(parsed)).not.toBe(
        CanonicalJson.stringify({ a: 1 }),
      );
    });

    it('distinguishes different __proto__ values', () => {
      const one = JSON.parse('{"__proto__":{"v":1}}') as unknown;
      const two = JSON.parse('{"__proto__":{"v":2}}') as unknown;
      expect(CanonicalJson.digest(one)).not.toBe(CanonicalJson.digest(two));
    });

    it('keeps constructor and prototype keys as data', () => {
      const value = JSON.parse(
        '{"constructor":{"prototype":{"x":1}},"toString":2}',
      ) as unknown;
      expect(CanonicalJson.stringify(value)).toBe(
        '{"constructor":{"prototype":{"x":1}},"toString":2}',
      );
    });

    it('returns objects without prototype from canonicalize', () => {
      const parsed = JSON.parse('{"__proto__":{"admin":true}}') as unknown;
      const result = CanonicalJson.canonicalize(parsed) as Record<
        string,
        unknown
      >;
      expect(Object.getPrototypeOf(result)).toBeNull();
      expect(Object.keys(result)).toEqual(['__proto__']);
      expect(({} as { admin?: unknown }).admin).toBeUndefined();
    });
  });

  describe('rejections', () => {
    const cyclic: Record<string, unknown> = { a: 1 };
    cyclic['self'] = cyclic;

    class Money {
      constructor(readonly amount: number) {}
    }

    const sparse: number[] = [1];
    sparse[2] = 3;

    it.each<[string, unknown, string]>([
      ['undefined at the root', undefined, '$'],
      ['undefined inside an array', [1, undefined], '$[1]'],
      ['a sparse array hole', sparse, '$[1]'],
      ['a function', { fn: () => 1 }, '$.fn'],
      ['a symbol', { s: Symbol('x') }, '$.s'],
      ['a bigint', { n: 10n }, '$.n'],
      ['NaN', { n: Number.NaN }, '$.n'],
      ['Infinity', [Number.POSITIVE_INFINITY], '$[0]'],
      ['a Date', { at: new Date(0) }, '$.at'],
      ['a Map', new Map(), '$'],
      ['a class instance', { price: new Money(1) }, '$.price'],
      ['a Buffer', { raw: Buffer.from('x') }, '$.raw'],
      ['a cycle', cyclic, '$.self'],
      ['a non-identifier key path', { 'a b': [() => 1] }, '$["a b"][0]'],
    ])('rejects %s', (_label, value, path) => {
      let error: unknown;
      try {
        CanonicalJson.stringify(value);
      } catch (caught) {
        error = caught;
      }
      expect(error).toBeInstanceOf(NonJsonValueError);
      const nonJson = error as NonJsonValueError;
      expect(nonJson.code).toBe(PrimitivesErrorCode.NonJsonValue);
      expect(nonJson.details?.['path']).toBe(path);
      expect(nonJson.retryable).toBe(false);
    });

    it('does not include the offending value in the error', () => {
      class Secret {
        toString(): string {
          return 'TOP-SECRET';
        }
      }
      try {
        CanonicalJson.stringify({ s: new Secret() });
        throw new Error('expected a NonJsonValueError');
      } catch (error) {
        expect((error as Error).message).not.toContain('TOP-SECRET');
        expect((error as Error).message).toContain('Secret instance');
      }
    });

    it('rejects nesting deeper than the limit', () => {
      let deep: unknown = 1;
      for (let i = 0; i <= CanonicalJson.MAX_DEPTH; i += 1) {
        deep = [deep];
      }
      expect(() => CanonicalJson.stringify(deep)).toThrow(NonJsonValueError);
    });

    it('accepts nesting up to the limit', () => {
      let deep: unknown = 1;
      for (let i = 0; i < CanonicalJson.MAX_DEPTH; i += 1) {
        deep = { a: deep };
      }
      expect(() => CanonicalJson.stringify(deep)).not.toThrow();
    });
  });
});

describe('CanonicalJson.digest', () => {
  it('is the sha256 hex of the canonical JSON', () => {
    const value = { b: [1, 2], a: 'x' };
    const expected = createHash('sha256')
      .update('{"a":"x","b":[1,2]}')
      .digest('hex');
    expect(CanonicalJson.digest(value)).toBe(expected);
    expect(CanonicalJson.digest(value)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is equal for equal structures and different otherwise', () => {
    expect(CanonicalJson.digest({ a: 1, b: 2 })).toBe(
      CanonicalJson.digest({ b: 2, a: 1 }),
    );
    expect(CanonicalJson.digest({ a: 1 })).not.toBe(
      CanonicalJson.digest({ a: '1' }),
    );
    expect(CanonicalJson.digest([1, 2])).not.toBe(CanonicalJson.digest([2, 1]));
  });

  it('propagates rejections', () => {
    expect(() => CanonicalJson.digest({ when: new Date() })).toThrow(
      NonJsonValueError,
    );
  });
});
