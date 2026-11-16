import { LoggerPort, LogLevel } from '@platform/observability';

/** Una línea registrada por {@link RecordingLogger}. */
export interface RecordedLine {
  readonly level: LogLevel;
  readonly message: string;
  readonly fields?: Record<string, unknown>;
}

/** Logger que guarda las líneas, para afirmar sobre ellas. */
export class RecordingLogger extends LoggerPort {
  readonly lines: RecordedLine[] = [];

  debug(message: string, fields?: Record<string, unknown>): void {
    this.lines.push({ level: LogLevel.Debug, message, fields });
  }

  info(message: string, fields?: Record<string, unknown>): void {
    this.lines.push({ level: LogLevel.Info, message, fields });
  }

  warn(message: string, fields?: Record<string, unknown>): void {
    this.lines.push({ level: LogLevel.Warn, message, fields });
  }

  error(message: string, fields?: Record<string, unknown>): void {
    this.lines.push({ level: LogLevel.Error, message, fields });
  }

  child(): LoggerPort {
    return this;
  }
}
