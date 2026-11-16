import { MemoryLogSink } from './utils/memory-log-sink.js';
import { LogLevel } from '../logging/log-level.enum.js';

describe('MemoryLogSink', () => {
  it('keeps every written record in order', () => {
    const sink = new MemoryLogSink();
    const timestamp = new Date('2026-01-02T03:04:05.000Z');

    sink.write({
      level: LogLevel.Info,
      message: 'first',
      timestamp,
      service: 'svc',
      fields: {},
    });
    sink.write({
      level: LogLevel.Error,
      message: 'second',
      timestamp,
      service: 'svc',
      fields: {},
    });

    expect(sink.records.map((record) => record.message)).toEqual([
      'first',
      'second',
    ]);
  });
});
