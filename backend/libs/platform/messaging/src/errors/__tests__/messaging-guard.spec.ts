import { MessagingError } from '../messaging-error.js';
import { MessagingErrorCode } from '../messaging-error-code.enum.js';
import { MessagingGuard } from '../messaging-guard.js';

describe('MessagingGuard', () => {
  describe('positiveInteger', () => {
    it.each([
      ['zero', 0],
      ['a negative number', -1],
      ['a fraction', 1.5],
      ['NaN', Number.NaN],
      ['infinity', Number.POSITIVE_INFINITY],
    ])('rejects %s with InvalidOptions', (_label, value) => {
      expect(() =>
        MessagingGuard.instance.positiveInteger('lease', value),
      ).toThrow(
        expect.objectContaining({ code: MessagingErrorCode.InvalidOptions }),
      );
    });

    it('returns a positive integer unchanged', () => {
      expect(MessagingGuard.instance.positiveInteger('lease', 30_000)).toBe(
        30_000,
      );
    });
  });

  describe('nonNegativeFinite', () => {
    it.each([
      ['a negative number', -1],
      ['NaN', Number.NaN],
      ['infinity', Number.POSITIVE_INFINITY],
    ])('rejects %s with InvalidOptions', (_label, value) => {
      expect(() =>
        MessagingGuard.instance.nonNegativeFinite('margin', value),
      ).toThrow(
        expect.objectContaining({ code: MessagingErrorCode.InvalidOptions }),
      );
    });

    it('returns zero and fractions unchanged', () => {
      expect(MessagingGuard.instance.nonNegativeFinite('margin', 0)).toBe(0);
      expect(MessagingGuard.instance.nonNegativeFinite('margin', 0.5)).toBe(
        0.5,
      );
    });
  });

  it('raises a MessagingError', () => {
    expect(() => MessagingGuard.instance.positiveInteger('lease', 0)).toThrow(
      MessagingError,
    );
  });
});
