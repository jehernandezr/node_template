import type { LoggerPort } from '@platform/observability';

export enum FakeLogLevel {
  Debug = 'debug',
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
}

export interface FakeLogEntry {
  readonly level: FakeLogLevel;
  readonly message: string;
  readonly fields?: Record<string, unknown>;
}

/** Logger that keeps each line to verify what was logged. */
export class FakeLogger implements LoggerPort {
  readonly entries: FakeLogEntry[] = [];

  debug(message: string, fields?: Record<string, unknown>): void {
    this.record(FakeLogLevel.Debug, message, fields);
  }

  info(message: string, fields?: Record<string, unknown>): void {
    this.record(FakeLogLevel.Info, message, fields);
  }

  warn(message: string, fields?: Record<string, unknown>): void {
    this.record(FakeLogLevel.Warn, message, fields);
  }

  error(message: string, fields?: Record<string, unknown>): void {
    this.record(FakeLogLevel.Error, message, fields);
  }

  /** The bindings are discarded: the same logger serves to verify the child. */
  child(): LoggerPort {
    return this;
  }

  levels(): FakeLogLevel[] {
    return this.entries.map((entry) => entry.level);
  }

  private record(
    level: FakeLogLevel,
    message: string,
    fields?: Record<string, unknown>,
  ): void {
    this.entries.push({ level, message, fields });
  }
}
