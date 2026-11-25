import type { LogRecord } from './log-record.js';

/** Destination of the logs. There is only one so each line is not paid for or stored twice. */
export abstract class LogSink {
  abstract write(record: LogRecord): void;
}
