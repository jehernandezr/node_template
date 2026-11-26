import { LoggerPort } from '@platform/observability';

/** A line recorded by {@link RecordingLogger}. */
export interface RecordedLine {
  readonly message: string;
  readonly fields?: Record<string, unknown>;
}

/** Logger that stores what is logged in `info` and `warn`, to check what an adapter leaves in the log. */
export class RecordingLogger extends LoggerPort {
  readonly lines: RecordedLine[] = [];

  override debug(): void {}

  override info(message: string, fields?: Record<string, unknown>): void {
    this.lines.push({ message, fields });
  }

  override warn(message: string, fields?: Record<string, unknown>): void {
    this.lines.push({ message, fields });
  }

  override error(message: string, fields?: Record<string, unknown>): void {
    this.lines.push({ message, fields });
  }

  override child(): LoggerPort {
    return this;
  }
}
