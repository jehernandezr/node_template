/** Format of a stable error code: `SERVICE.SUBMODULE.ERROR`. */
export class ErrorCode {
  /**
   * Uppercase letters, digits or underscores, with at least three segments separated by
   * dots. The contracts declare the same expression, because a contract
   * cannot depend on the kernel; a test checks that they match.
   */
  static readonly PATTERN = /^[A-Z][A-Z0-9_]*(\.[A-Z][A-Z0-9_]*){2,}$/;

  /**
   * Whether `value` is a text with the format of an error code.
   * @param value Value to check.
   * @returns `true` when it is a code.
   */
  static isValid(value: unknown): value is string {
    return typeof value === 'string' && ErrorCode.PATTERN.test(value);
  }
}
