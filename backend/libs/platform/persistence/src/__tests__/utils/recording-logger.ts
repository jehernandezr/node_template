import { LoggerPort } from '@platform/observability';

/** A log entry stored by {@link RecordingLogger}. */
export interface RecordedLog {
  readonly message: string;
  readonly fields?: Record<string, unknown>;
}

/** `LoggerPort` that stores errors and warnings so the test can check them. */
export class RecordingLogger extends LoggerPort {
  readonly errors: RecordedLog[] = [];
  readonly warnings: RecordedLog[] = [];

  override debug(): void {}

  override info(): void {}

  override warn(message: string, fields?: Record<string, unknown>): void {
    this.warnings.push({ message, fields });
  }

  override error(message: string, fields?: Record<string, unknown>): void {
    this.errors.push({ message, fields });
  }

  override child(): LoggerPort {
    return this;
  }
}
