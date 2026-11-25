import { PlatformError } from '@platform/kernel';

/** Short description of an error thrown by service code, without input values. */
export class ErrorDetail {
  /** Anything longer than this is truncated, so a huge message does not bloat the instance. */
  static readonly MAX_LENGTH = 300;

  /**
   * A platform error gives its code and message, which by convention do not
   * carry input values; any other error gives its name and message.
   */
  static of(error: unknown): string {
    let text: string;
    if (PlatformError.is(error)) {
      text = `${error.code}: ${error.message}`;
    } else if (error instanceof Error) {
      text = `${error.name}: ${error.message}`;
    } else {
      text = `thrown ${typeof error}`;
    }
    return text.length > ErrorDetail.MAX_LENGTH
      ? `${text.slice(0, ErrorDetail.MAX_LENGTH - 1)}…`
      : text;
  }
}
