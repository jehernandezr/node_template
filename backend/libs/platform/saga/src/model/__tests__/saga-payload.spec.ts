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
      ['un bigint', { big: BigInt(1) }],
      ['una función', { run: () => 1 }],
      ['un Map', { map: new Map() }],
      [
        'un ciclo',
        (() => {
          const cycle: Record<string, unknown> = {};
          cycle.self = cycle;
          return cycle;
        })(),
      ],
      ['un undefined dentro de un arreglo', [1, undefined]],
    ])('rechaza %s con InvalidState', (_label, value) => {
      expect(codeOf(() => SagaPayload.assertSerializable(value))).toBe(
        SagaErrorCode.InvalidState,
      );
    });

    it('acepta un undefined de primer nivel', () => {
      expect(() => SagaPayload.assertSerializable(undefined)).not.toThrow();
    });

    it('acepta un valor JSON con forma intacta', () => {
      expect(() =>
        SagaPayload.assertSerializable({
          a: [1, 'x', null, true],
          b: { c: 2 },
        }),
      ).not.toThrow();
    });
  });

  describe('clone', () => {
    it('devuelve una copia independiente del original', () => {
      const original = { list: [1, { deep: 'value' }] };

      const copy = SagaPayload.clone(original);
      copy.list[1] = { deep: 'changed' };

      expect(original.list[1]).toEqual({ deep: 'value' });
      expect(copy).not.toBe(original);
    });

    it('conserva undefined de primer nivel', () => {
      expect(SagaPayload.clone(undefined)).toBeUndefined();
    });
  });

  describe('digest', () => {
    it('es igual con las llaves en otro orden', () => {
      expect(SagaPayload.digest({ a: 1, b: { c: 2, d: 3 } })).toBe(
        SagaPayload.digest({ b: { d: 3, c: 2 }, a: 1 }),
      );
    });

    it('cambia con otro valor', () => {
      expect(SagaPayload.digest({ a: 1 })).not.toBe(
        SagaPayload.digest({ a: 2 }),
      );
    });
  });
});
