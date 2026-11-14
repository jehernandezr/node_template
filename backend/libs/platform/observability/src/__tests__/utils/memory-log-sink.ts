import { LogSink, type LogRecord } from '../../index.js';

/** Guarda los logs en memoria, para pruebas. */
export class MemoryLogSink extends LogSink {
  readonly records: LogRecord[] = [];

  write(record: LogRecord): void {
    this.records.push(record);
  }
}
