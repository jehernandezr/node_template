import { LoggerPort } from '@platform/observability';

/** A logged message with its fields. */
export interface RecordedLog {
  readonly level: 'debug' | 'info' | 'warn' | 'error';
  readonly message: string;
  readonly fields: Record<string, unknown> | undefined;
}

/** Logger that stores its messages for the test to inspect. */
export class RecordingLogger extends LoggerPort {
  readonly entries: RecordedLog[] = [];

  override debug(message: string, fields?: Record<string, unknown>): void {
    this.entries.push({ level: 'debug', message, fields });
  }

  override info(message: string, fields?: Record<string, unknown>): void {
    this.entries.push({ level: 'info', message, fields });
  }

  override warn(message: string, fields?: Record<string, unknown>): void {
    this.entries.push({ level: 'warn', message, fields });
  }

  override error(message: string, fields?: Record<string, unknown>): void {
    this.entries.push({ level: 'error', message, fields });
  }

  override child(): LoggerPort {
    return this;
  }

  /** Messages of a level. */
  at(level: RecordedLog['level']): RecordedLog[] {
    return this.entries.filter((entry) => entry.level === level);
  }
}
