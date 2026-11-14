import type { LoggerPort } from '@platform/observability';
import { RecordedLogLevel } from './recorded-log-level.enum.js';

/** Un registro recibido por {@link RecordingLogger}. */
export interface RecordedLogEntry {
  readonly level: RecordedLogLevel;
  readonly message: string;
  readonly fields?: Record<string, unknown>;
}

/** Logger que guarda los registros, para pruebas. */
export class RecordingLogger implements LoggerPort {
  readonly entries: RecordedLogEntry[] = [];

  debug(message: string, fields?: Record<string, unknown>): void {
    this.entries.push({ level: RecordedLogLevel.Debug, message, fields });
  }

  info(message: string, fields?: Record<string, unknown>): void {
    this.entries.push({ level: RecordedLogLevel.Info, message, fields });
  }

  warn(message: string, fields?: Record<string, unknown>): void {
    this.entries.push({ level: RecordedLogLevel.Warn, message, fields });
  }

  error(message: string, fields?: Record<string, unknown>): void {
    this.entries.push({ level: RecordedLogLevel.Error, message, fields });
  }

  /** Un hijo comparte los registros del padre. */
  child(): LoggerPort {
    return this;
  }
}
