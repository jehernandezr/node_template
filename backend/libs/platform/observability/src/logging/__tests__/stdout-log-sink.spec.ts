import { LogLevel } from '../log-level.enum.js';
import { LogField } from '../log-field.enum.js';
import { StdoutLogSink } from '../stdout-log-sink.js';
import { LineCollector } from './utils/line-collector.js';

const TIMESTAMP = new Date('2026-01-02T03:04:05.000Z');

describe('StdoutLogSink', () => {
  it('writes one JSON line with the fixed fields and the record fields', () => {
    const collector = new LineCollector();
    const sink = new StdoutLogSink(collector);

    sink.write({
      level: LogLevel.Info,
      message: 'user signed in',
      timestamp: TIMESTAMP,
      service: 'svc',
      context: 'auth',
      fields: {
        count: 2,
        [LogField.TraceId]: '0af7651916cd43dd8448eb211c80319c',
      },
    });

    expect(collector.parsed()).toEqual([
      {
        timestamp: '2026-01-02T03:04:05.000Z',
        level: 'info',
        service: 'svc',
        context: 'auth',
        message: 'user signed in',
        count: 2,
        trace_id: '0af7651916cd43dd8448eb211c80319c',
      },
    ]);
  });

  it('leaves out the context field when the record has no context', () => {
    const collector = new LineCollector();
    const sink = new StdoutLogSink(collector);

    sink.write({
      level: LogLevel.Warn,
      message: 'degraded',
      timestamp: TIMESTAMP,
      service: 'svc',
      fields: {},
    });

    expect(collector.parsed()[0]).not.toHaveProperty(LogField.Context);
    expect(collector.parsed()[0]).toMatchObject({
      level: 'warn',
      message: 'degraded',
    });
  });

  it('ends each record with a newline, one record per write', () => {
    const collector = new LineCollector();

    new StdoutLogSink(collector).write({
      level: LogLevel.Info,
      message: 'hi',
      timestamp: TIMESTAMP,
      service: 'svc',
      fields: {},
    });

    expect(collector.chunks).toHaveLength(1);
    expect(collector.chunks[0]?.endsWith('\n')).toBe(true);
    expect(collector.parsed()).toEqual([
      expect.objectContaining({ message: 'hi' }),
    ]);
  });
});
