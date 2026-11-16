import { PrimitivesErrorCode } from '../primitives-error-code.enum.js';
import { PrimitivesGuard } from '../primitives-guard.js';

describe('PrimitivesGuard', () => {
  it('returns the validated value', () => {
    expect(PrimitivesGuard.instance.positiveInteger('n', 2)).toBe(2);
  });

  it('throws InvalidArgumentError naming the argument', () => {
    expect(() =>
      PrimitivesGuard.instance.nonNegativeFinite('budgetMs', -1),
    ).toThrow(
      expect.objectContaining({
        code: PrimitivesErrorCode.InvalidArgument,
        details: { argument: 'budgetMs', expectation: 'a finite number >= 0' },
      }),
    );
  });
});
