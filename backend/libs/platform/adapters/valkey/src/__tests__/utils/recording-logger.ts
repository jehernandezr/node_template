import { LoggerPort } from '@platform/observability';

/** Error line recorded by {@link RecordingLogger}. */
export interface RecordedError {
  readonly message: string;
  readonly fields?: Record<string, unknown>;
}

/** Logger that records the errors, to assert on them. */
export class RecordingLogger extends LoggerPort {
  readonly errors: RecordedError[] = [];

  debug(): void {
    // Only errors matter.
  }

  info(): void {
    // Only errors matter.
  }

  warn(): void {
    // Only errors matter.
  }

  error(message: string, fields?: Record<string, unknown>): void {
    this.errors.push({ message, fields });
  }

  child(): LoggerPort {
    return this;
  }
}
