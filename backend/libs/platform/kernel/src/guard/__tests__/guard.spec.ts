import { GuardViolationError } from '../../errors/guard-violation.error.js';
import { KernelErrorCode } from '../../errors/kernel-error-code.enum.js';
import { Guard } from '../guard.js';

class CustomError extends Error {}

/** A number that arrives where the type promises text, as from unvalidated input. */
const NOT_A_STRING = JSON.parse('5') as string;

describe('Guard', () => {
  const guard = new Guard();

  it.each([
    ['positiveInteger', (g: Guard) => g.positiveInteger('n', 3), 3],
    ['nonNegativeInteger', (g: Guard) => g.nonNegativeInteger('n', 0), 0],
    ['nonNegativeFinite', (g: Guard) => g.nonNegativeFinite('n', 1.5), 1.5],
    ['integerInRange', (g: Guard) => g.integerInRange('n', 5, 1, 5), 5],
    ['nonEmpty', (g: Guard) => g.nonEmpty('s', 'a'), 'a'],
    ['matches', (g: Guard) => g.matches('s', 'ab', /^a/), 'ab'],
  ])('%s returns the validated value', (_name, run, expected) => {
    expect(run(guard)).toBe(expected);
  });

  it.each([
    ['positiveInteger 0', (g: Guard) => g.positiveInteger('n', 0)],
    ['positiveInteger 1.5', (g: Guard) => g.positiveInteger('n', 1.5)],
    ['nonNegativeInteger -1', (g: Guard) => g.nonNegativeInteger('n', -1)],
    ['nonNegativeInteger NaN', (g: Guard) => g.nonNegativeInteger('n', NaN)],
    ['nonNegativeFinite -1', (g: Guard) => g.nonNegativeFinite('n', -1)],
    [
      'nonNegativeFinite Infinity',
      (g: Guard) => g.nonNegativeFinite('n', Infinity),
    ],
    ['integerInRange below', (g: Guard) => g.integerInRange('n', 0, 1, 5)],
    ['integerInRange above', (g: Guard) => g.integerInRange('n', 6, 1, 5)],
    ['integerInRange fraction', (g: Guard) => g.integerInRange('n', 2.5, 1, 5)],
    ['nonEmpty empty', (g: Guard) => g.nonEmpty('s', '')],
    ['nonEmpty non-string', (g: Guard) => g.nonEmpty('s', NOT_A_STRING)],
    ['matches mismatch', (g: Guard) => g.matches('s', 'b', /^a/)],
    ['matches non-string', (g: Guard) => g.matches('s', NOT_A_STRING, /^a/)],
  ])('%s throws GuardViolationError by default', (_name, run) => {
    expect(() => run(guard)).toThrow(GuardViolationError);
  });

  it('names the argument and the expectation in the default error', () => {
    expect(() => guard.positiveInteger('limit', 0)).toThrow(
      expect.objectContaining({
        code: KernelErrorCode.GuardViolation,
        message: 'limit must be a positive integer',
        details: { argument: 'limit', expectation: 'a positive integer' },
      }),
    );
  });

  it('lets a library supply its own error', () => {
    const custom = new Guard((message) => new CustomError(message));
    expect(() => custom.nonEmpty('name', '')).toThrow(CustomError);
    expect(() => custom.nonEmpty('name', '')).toThrow(
      'name must be a non-empty string',
    );
  });

  it('exposes a shared default instance', () => {
    expect(Guard.default).toBeInstanceOf(Guard);
    expect(() => Guard.default.positiveInteger('n', -1)).toThrow(
      GuardViolationError,
    );
  });
});
