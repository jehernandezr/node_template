import { CriteriaErrorCode } from './enums.js';
import { CriteriaError } from './errors.js';

/** Largest page size accepted by `limit`. */
export const MAX_LIMIT = 1000;

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Builds an `InvalidValue` error. Messages never include the offending value. */
export function invalid(message: string): CriteriaError {
  return new CriteriaError(CriteriaErrorCode.InvalidValue, message);
}

/** Throws `InvalidLimit` unless `limit` is an integer between 1 and `MAX_LIMIT`. */
export function assertLimit(limit: number): void {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new CriteriaError(
      CriteriaErrorCode.InvalidLimit,
      `limit must be an integer between 1 and ${MAX_LIMIT}`,
    );
  }
}

/** Throws `InvalidValue` unless `name` is a plain SQL identifier (letters, digits, underscore). */
export function assertIdentifier(name: string, what: string): void {
  if (typeof name !== 'string' || !IDENTIFIER.test(name)) {
    throw invalid(`${what} must match ^[A-Za-z_][A-Za-z0-9_]*$`);
  }
}

/** Throws `InvalidValue` when `value` is undefined. */
export function assertDefined(value: unknown, what: string): void {
  if (value === undefined) {
    throw invalid(`${what} must not be undefined`);
  }
}

/** Throws `InvalidValue` when `value` is null or undefined. */
export function assertPresent(value: unknown, what: string): void {
  if (value === undefined || value === null) {
    throw invalid(`${what} must not be null or undefined`);
  }
}

/** Throws `InvalidValue` unless `value` is a string. */
export function assertText(
  value: unknown,
  what: string,
): asserts value is string {
  if (typeof value !== 'string') {
    throw invalid(`${what} must be a string`);
  }
}

/** Returns a frozen copy of `value`. Throws `InvalidValue` when it is not an array or holds null or undefined. */
export function listOf(value: unknown): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw invalid('expected an array of values');
  }
  for (const item of value) {
    assertPresent(item, 'list item');
  }
  return Object.freeze([...value]);
}
