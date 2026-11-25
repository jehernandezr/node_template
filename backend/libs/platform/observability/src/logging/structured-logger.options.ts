import type { Clock } from '@platform/kernel';
import type { RequestContextStore } from '../context/request-context-store.js';
import type { Redactor } from '../redaction/redactor.js';
import type { Tracing } from '../tracing/tracing.js';
import type { LogLevel } from './log-level.enum.js';
import type { LogSink } from './log-sink.js';

export interface StructuredLoggerOptions {
  readonly service: string;
  readonly level: LogLevel;
  /** Modules (`context` values) that emit debug regardless of the level. */
  readonly debugContexts: readonly string[];
  readonly sink: LogSink;
  readonly redactor: Redactor;
  readonly contextStore: RequestContextStore;
  /** Source of the active span ids when there is no open context. */
  readonly tracing: Tracing;
  readonly clock: Clock;
  /** Value of the `context` field of this logger. */
  readonly context?: string;
}
