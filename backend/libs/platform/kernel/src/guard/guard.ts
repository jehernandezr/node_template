import { GuardViolationError } from '../errors/guard-violation.error.js';

/** Which argument failed and what was expected of it. */
export interface GuardViolation {
  readonly name: string;
  readonly expectation: string;
}

/**
 * Builds the error of a violation. It receives the already written message and, for
 * whoever needs to separate argument and expectation, the violation.
 */
export type GuardFailure = (
  message: string,
  violation: GuardViolation,
) => Error;

/**
 * Argument validations with the error as a collaborator: each library
 * builds its guard with its own error type and codes. Each method
 * returns the validated value, so validation happens in the same assignment.
 */
export class Guard {
  /** Guard that throws `GuardViolationError`. */
  static readonly default = new Guard();

  constructor(
    private readonly fail: GuardFailure = (_message, violation) =>
      new GuardViolationError(violation.name, violation.expectation),
  ) {}

  /**
   * Checks that a value is an integer greater than zero.
   * @param name Name used in the error.
   * @param value Value to check.
   * @returns The value.
   */
  positiveInteger(name: string, value: number): number {
    return this.require(
      Number.isInteger(value) && value > 0,
      name,
      value,
      'a positive integer',
    );
  }

  /**
   * Checks that a value is an integer of zero or more.
   * @param name Name used in the error.
   * @param value Value to check.
   * @returns The value.
   */
  nonNegativeInteger(name: string, value: number): number {
    return this.require(
      Number.isInteger(value) && value >= 0,
      name,
      value,
      'an integer >= 0',
    );
  }

  /**
   * Checks that a value is finite and not negative.
   * @param name Name used in the error.
   * @param value Value to check.
   * @returns The value.
   */
  nonNegativeFinite(name: string, value: number): number {
    return this.require(
      Number.isFinite(value) && value >= 0,
      name,
      value,
      'a finite number >= 0',
    );
  }

  /**
   * Checks that a value is an integer within `[min, max]`.
   * @param name Name used in the error.
   * @param value Value to check.
   * @param min Smallest allowed value.
   * @param max Largest allowed value.
   * @returns The value.
   */
  integerInRange(
    name: string,
    value: number,
    min: number,
    max: number,
  ): number {
    return this.require(
      Number.isInteger(value) && value >= min && value <= max,
      name,
      value,
      `an integer between ${min} and ${max}`,
    );
  }

  /**
   * Checks that a text is not blank.
   * @param name Name used in the error.
   * @param value Value to check.
   * @returns The value.
   */
  nonEmpty(name: string, value: string): string {
    return this.require(
      typeof value === 'string' && value.length > 0,
      name,
      value,
      'a non-empty string',
    );
  }

  /**
   * Checks that a text matches a pattern.
   * @param name Name used in the error.
   * @param value Value to check.
   * @param pattern Required pattern.
   * @returns The value.
   */
  matches(name: string, value: string, pattern: RegExp): string {
    return this.require(
      typeof value === 'string' && pattern.test(value),
      name,
      value,
      `a string matching ${pattern.source}`,
    );
  }

  private require<T>(
    holds: boolean,
    name: string,
    value: T,
    expectation: string,
  ): T {
    if (!holds) {
      throw this.fail(`${name} must be ${expectation}`, { name, expectation });
    }
    return value;
  }
}
