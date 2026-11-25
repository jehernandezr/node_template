import type { LogLevel } from './log-level.enum.js';

/**
 * A log ready to write: the message and the fields are already redacted and
 * `fields` already carries the trace and context fields (`LogField`) of the moment.
 */
export interface LogRecord {
  readonly level: LogLevel;
  readonly message: string;
  readonly timestamp: Date;
  readonly service: string;
  readonly context?: string;
  readonly fields: Readonly<Record<string, unknown>>;
}
