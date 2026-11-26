import { ErrorCode } from './error-code.js';

/** Error data that is safe to log: without cause, details or stack. */
export interface ErrorDescription {
  readonly name: string;
  readonly code?: string;
  readonly message: string;
}

/**
 * Describes any thrown value. It is static because it has no state or
 * dependencies, and the log recorder, the metrics and the
 * message dispatcher share it.
 */
export class ErrorDescriptor {
  /**
   * Returns the name, valid code and message of `error`; a value that is not an `Error` is converted to text.
   * @param error Error to describe.
   * @returns The description.
   */
  static describe(error: unknown): ErrorDescription {
    if (error instanceof Error) {
      const code = ErrorDescriptor.codeOf(error);
      return code === undefined
        ? { name: error.name, message: error.message }
        : { name: error.name, code, message: error.message };
    }
    return { name: typeof error, message: String(error) };
  }

  /**
   * Returns the error `code` only if it satisfies `ErrorCode.isValid`; otherwise, `undefined`.
   * @param error Error to read.
   * @returns The code, or `undefined`.
   */
  static codeOf(error: unknown): string | undefined {
    if (typeof error !== 'object' || error === null) {
      return undefined;
    }
    const code = (error as { code?: unknown }).code;
    return ErrorCode.isValid(code) ? code : undefined;
  }
}
