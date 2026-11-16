import { LogLevel } from '../log-level.enum.js';
import { LogField } from '../log-field.enum.js';
import { StdoutLogSink } from '../stdout-log-sink.js';
import { LineCollector } from './utils/line-collector.js';

const TIMESTAMP = new Date('2026-01-02T03:04:05.000Z');

describe('StdoutLogSink', () => {
  it('writes one JSON line with the fixed fields and the record fields', () => {
    const collector = new LineCollector();
    const sink = new StdoutLogSink((line) => collector.write(line));

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
    const sink = new StdoutLogSink((line) => collector.write(line));

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

  it('writes to stdout with a trailing newline by default', () => {
    const spy = jest.spyOn(process.stdout, 'write').mockReturnValue(true);

    new StdoutLogSink().write({
      level: LogLevel.Info,
      message: 'hi',
      timestamp: TIMESTAMP,
      service: 'svc',
      fields: {},
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const written = spy.mock.calls[0][0] as string;
    expect(written.endsWith('\n')).toBe(true);
    expect(JSON.parse(written)).toMatchObject({ message: 'hi' });
    spy.mockRestore();
  });
});
