import type { LogRecord } from './log-record.js';

/** Destino de los logs. Es uno solo para no pagar ni guardar cada línea dos veces. */
export abstract class LogSink {
  abstract write(record: LogRecord): void;
}
