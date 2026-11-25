import { Pagination } from '@contracts/platform';
import { CriteriaError } from './errors/criteria-error.js';
import { CriteriaErrorCode } from './errors/criteria-error-code.enum.js';

/** Input validations of `Criteria` and the translator. Messages never include the received value. */
export class CriteriaValidator {
  /** Maximum page size: the contract's `Pagination.maxLimit`. */
  static readonly MAX_LIMIT: number = Pagination.maxLimit;

  private static readonly IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

  /** Builds an `InvalidValue` error. The caller decides whether to throw it. */
  static invalid(message: string): CriteriaError {
    return new CriteriaError(CriteriaErrorCode.InvalidValue, message);
  }

  /** @throws CriteriaError `InvalidLimit` unless `limit` is an integer between 1 and `MAX_LIMIT`. */
  static limit(limit: number): void {
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > CriteriaValidator.MAX_LIMIT
    ) {
      throw new CriteriaError(
        CriteriaErrorCode.InvalidLimit,
        `limit must be an integer between 1 and ${CriteriaValidator.MAX_LIMIT}`,
      );
    }
  }

  /** @throws CriteriaError `InvalidValue` unless `name` is a simple SQL identifier. */
  static identifier(name: string, what: string): void {
    if (typeof name !== 'string' || !CriteriaValidator.IDENTIFIER.test(name)) {
      throw CriteriaValidator.invalid(
        `${what} must match ^[A-Za-z_][A-Za-z0-9_]*$`,
      );
    }
  }

  /** @throws CriteriaError `InvalidValue` if `value` is `undefined`. */
  static defined(value: unknown, what: string): void {
    if (value === undefined) {
      throw CriteriaValidator.invalid(`${what} must not be undefined`);
    }
  }

  /** @throws CriteriaError `InvalidValue` if `value` is `null` or `undefined`. */
  static present(value: unknown, what: string): void {
    if (value === undefined || value === null) {
      throw CriteriaValidator.invalid(`${what} must not be null or undefined`);
    }
  }

  /** @throws CriteriaError `InvalidValue` unless `value` is a string. */
  static text(value: unknown, what: string): asserts value is string {
    if (typeof value !== 'string') {
      throw CriteriaValidator.invalid(`${what} must be a string`);
    }
  }

  /** Frozen copy of the list. @throws CriteriaError `InvalidValue` if it is not an array or has `null` or `undefined`. */
  static list(value: unknown): readonly unknown[] {
    if (!Array.isArray(value)) {
      throw CriteriaValidator.invalid('expected an array of values');
    }
    for (const item of value) {
      CriteriaValidator.present(item, 'list item');
    }
    return Object.freeze([...value]);
  }
}
