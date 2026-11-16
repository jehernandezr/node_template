import { Pagination } from '@contracts/platform';
import { CriteriaValidator } from '../criteria-validator.js';
import { CriteriaErrorCode } from '../errors/criteria-error-code.enum.js';
import { CriteriaError } from '../errors/criteria-error.js';

function codeOf(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(CriteriaError);
    return (error as CriteriaError).code;
  }
  return undefined;
}

describe('CriteriaValidator', () => {
  it('uses the page size of the pagination contract', () => {
    expect(CriteriaValidator.MAX_LIMIT).toBe(Pagination.maxLimit);
  });

  describe('invalid', () => {
    it('returns an InvalidValue error without throwing it', () => {
      const error = CriteriaValidator.invalid('bad input');
      expect(error).toBeInstanceOf(CriteriaError);
      expect(error.code).toBe(CriteriaErrorCode.InvalidValue);
      expect(error.message).toBe('bad input');
    });
  });

  describe('limit', () => {
    it('accepts an integer from 1 to MAX_LIMIT', () => {
      expect(() => CriteriaValidator.limit(1)).not.toThrow();
      expect(() =>
        CriteriaValidator.limit(CriteriaValidator.MAX_LIMIT),
      ).not.toThrow();
    });

    it('rejects a value outside the range with InvalidLimit', () => {
      expect(codeOf(() => CriteriaValidator.limit(0))).toBe(
        CriteriaErrorCode.InvalidLimit,
      );
      expect(
        codeOf(() => CriteriaValidator.limit(CriteriaValidator.MAX_LIMIT + 1)),
      ).toBe(CriteriaErrorCode.InvalidLimit);
    });
  });

  describe('identifier', () => {
    it('accepts a plain SQL identifier', () => {
      expect(() =>
        CriteriaValidator.identifier('created_at', 'column'),
      ).not.toThrow();
    });

    it('rejects names with spaces, dashes or leading digits', () => {
      expect(codeOf(() => CriteriaValidator.identifier('a b', 'column'))).toBe(
        CriteriaErrorCode.InvalidValue,
      );
      expect(codeOf(() => CriteriaValidator.identifier('a-b', 'column'))).toBe(
        CriteriaErrorCode.InvalidValue,
      );
      expect(codeOf(() => CriteriaValidator.identifier('1a', 'column'))).toBe(
        CriteriaErrorCode.InvalidValue,
      );
    });
  });

  describe('defined', () => {
    it('accepts null and rejects undefined', () => {
      expect(() => CriteriaValidator.defined(null, 'value')).not.toThrow();
      expect(codeOf(() => CriteriaValidator.defined(undefined, 'value'))).toBe(
        CriteriaErrorCode.InvalidValue,
      );
    });
  });

  describe('present', () => {
    it('accepts a value and rejects null and undefined', () => {
      expect(() => CriteriaValidator.present(0, 'value')).not.toThrow();
      expect(codeOf(() => CriteriaValidator.present(null, 'value'))).toBe(
        CriteriaErrorCode.InvalidValue,
      );
      expect(codeOf(() => CriteriaValidator.present(undefined, 'value'))).toBe(
        CriteriaErrorCode.InvalidValue,
      );
    });
  });

  describe('text', () => {
    it('accepts a string and rejects other types', () => {
      expect(() => CriteriaValidator.text('abc', 'pattern')).not.toThrow();
      expect(codeOf(() => CriteriaValidator.text(42, 'pattern'))).toBe(
        CriteriaErrorCode.InvalidValue,
      );
    });
  });

  describe('list', () => {
    it('returns a frozen copy of the values', () => {
      const values = ['a', 'b'];
      const copy = CriteriaValidator.list(values);
      values.push('c');
      expect(copy).toEqual(['a', 'b']);
      expect(Object.isFrozen(copy)).toBe(true);
    });

    it('rejects a non-array and a list with null or undefined items', () => {
      expect(codeOf(() => CriteriaValidator.list('abc'))).toBe(
        CriteriaErrorCode.InvalidValue,
      );
      expect(codeOf(() => CriteriaValidator.list(['a', null]))).toBe(
        CriteriaErrorCode.InvalidValue,
      );
      expect(codeOf(() => CriteriaValidator.list([undefined]))).toBe(
        CriteriaErrorCode.InvalidValue,
      );
    });
  });
});
