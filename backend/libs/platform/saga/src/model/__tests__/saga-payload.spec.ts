import { SagaErrorCode } from '../../errors/saga-error-code.enum.js';
import { SagaError } from '../../errors/saga-error.js';
import { SagaPayload } from '../saga-payload.js';

function codeOf(action: () => void): SagaErrorCode | undefined {
  try {
    action();
    return undefined;
  } catch (error) {
    return error instanceof SagaError ? error.code : undefined;
  }
}

describe('SagaPayload', () => {
  describe('assertSerializable', () => {
    it.each([
      ['a bigint', { big: BigInt(1) }],
      ['a function', { run: () => 1 }],
      ['a Map', { map: new Map() }],
      [
        'a cycle',
        (() => {
          const cycle: Record<string, unknown> = {};
          cycle.self = cycle;
          return cycle;
        })(),
      ],
      ['an undefined inside an array', [1, undefined]],
    ])('rejects %s with InvalidState', (_label, value) => {
      expect(codeOf(() => SagaPayload.assertSerializable(value))).toBe(
        SagaErrorCode.InvalidState,
      );
    });

    it('accepts a top-level undefined', () => {
      expect(() => SagaPayload.assertSerializable(undefined)).not.toThrow();
    });

    it('accepts a JSON value with its shape intact', () => {
      expect(() =>
        SagaPayload.assertSerializable({
          a: [1, 'x', null, true],
          b: { c: 2 },
        }),
      ).not.toThrow();
    });
  });

  describe('clone', () => {
    it('returns a copy independent of the original', () => {
      const original = { list: [1, { deep: 'value' }] };

      const copy = SagaPayload.clone(original);
      copy.list[1] = { deep: 'changed' };

      expect(original.list[1]).toEqual({ deep: 'value' });
      expect(copy).not.toBe(original);
    });

    it('keeps top-level undefined', () => {
      expect(SagaPayload.clone(undefined)).toBeUndefined();
    });
  });

  describe('digest', () => {
    it('is equal with the keys in another order', () => {
      expect(SagaPayload.digest({ a: 1, b: { c: 2, d: 3 } })).toBe(
        SagaPayload.digest({ b: { d: 3, c: 2 }, a: 1 }),
      );
    });

    it('changes with another value', () => {
      expect(SagaPayload.digest({ a: 1 })).not.toBe(
        SagaPayload.digest({ a: 2 }),
      );
    });
  });
});
