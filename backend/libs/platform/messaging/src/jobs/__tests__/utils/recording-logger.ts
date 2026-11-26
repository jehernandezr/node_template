import { LoggerPort } from '@platform/observability';

/** An error line that was logged. */
export interface RecordedError {
  readonly message: string;
  readonly attributes?: Readonly<Record<string, unknown>>;
}

/** Logger that keeps the errors for the test to inspect and discards the rest. */
export class RecordingLogger extends LoggerPort {
  readonly errors: RecordedError[] = [];

  /** Discards the line. */
  override debug(): void {
    return;
  }

  /** Discards the line. */
  override info(): void {
    return;
  }

  /** Discards the line. */
  override warn(): void {
    return;
  }

  /** Stores the error. */
  override error(
    message: string,
    attributes?: Readonly<Record<string, unknown>>,
  ): void {
    this.errors.push({ message, ...(attributes && { attributes }) });
  }

  /** The same logger. */
  override child(): LoggerPort {
    return this;
  }
}
