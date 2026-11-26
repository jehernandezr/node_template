import { LogSink, type LogRecord } from '../../index.js';

/** Stores logs in memory, for tests. */
export class MemoryLogSink extends LogSink {
  readonly records: LogRecord[] = [];

  override write(record: LogRecord): void {
    this.records.push(record);
  }
}
