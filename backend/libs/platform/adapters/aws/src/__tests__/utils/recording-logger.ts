import { LoggerPort, LogLevel } from '@platform/observability';

/** A line recorded by {@link RecordingLogger}. */
export interface RecordedLine {
  readonly level: LogLevel;
  readonly message: string;
  readonly fields?: Record<string, unknown>;
}

/** Logger that stores the lines, to assert on them. */
export class RecordingLogger extends LoggerPort {
  readonly lines: RecordedLine[] = [];

  override debug(message: string, fields?: Record<string, unknown>): void {
    this.lines.push({ level: LogLevel.Debug, message, fields });
  }

  override info(message: string, fields?: Record<string, unknown>): void {
    this.lines.push({ level: LogLevel.Info, message, fields });
  }

  override warn(message: string, fields?: Record<string, unknown>): void {
    this.lines.push({ level: LogLevel.Warn, message, fields });
  }

  override error(message: string, fields?: Record<string, unknown>): void {
    this.lines.push({ level: LogLevel.Error, message, fields });
  }

  override child(): LoggerPort {
    return this;
  }
}
