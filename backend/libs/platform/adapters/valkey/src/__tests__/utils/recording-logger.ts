import { LoggerPort } from '@platform/observability';

/** Error line recorded by {@link RecordingLogger}. */
export interface RecordedError {
  readonly message: string;
  readonly fields?: Record<string, unknown>;
}

/** Logger that records the errors, to assert on them. */
export class RecordingLogger extends LoggerPort {
  readonly errors: RecordedError[] = [];

  override debug(): void {}

  override info(): void {}

  override warn(): void {}

  override error(message: string, fields?: Record<string, unknown>): void {
    this.errors.push({ message, fields });
  }

  override child(): LoggerPort {
    return this;
  }
}
