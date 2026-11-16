import type { Clock } from '@platform/kernel';
import type { RequestContextStore } from '../context/request-context-store.js';
import type { Redactor } from '../redaction/redactor.js';
import type { Tracing } from '../tracing/tracing.js';
import type { LogLevel } from './log-level.enum.js';
import type { LogSink } from './log-sink.js';

export interface StructuredLoggerOptions {
  readonly service: string;
  readonly level: LogLevel;
  /** Módulos (valores de `context`) que emiten debug sin importar el nivel. */
  readonly debugContexts: readonly string[];
  readonly sink: LogSink;
  readonly redactor: Redactor;
  readonly contextStore: RequestContextStore;
  /** Fuente de los ids del span activo cuando no hay contexto abierto. */
  readonly tracing: Tracing;
  readonly clock: Clock;
  /** Valor del campo `context` de este logger. */
  readonly context?: string;
}
