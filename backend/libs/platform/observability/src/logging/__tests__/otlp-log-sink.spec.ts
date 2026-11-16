import { SeverityNumber } from '@opentelemetry/api';
import { LogField } from '../log-field.enum.js';
import { LogLevel } from '../log-level.enum.js';
import { OtlpLogSink } from '../otlp-log-sink.js';
import { FakeOtelLogger } from './utils/fake-otel-logger.js';

const TIMESTAMP = new Date('2026-01-02T03:04:05.000Z');

describe('OtlpLogSink', () => {
  const logger = new FakeOtelLogger();
  const sink = new OtlpLogSink(logger);

  beforeEach(() => {
    logger.emitted.length = 0;
  });

  it.each([
    [LogLevel.Debug, SeverityNumber.DEBUG],
    [LogLevel.Info, SeverityNumber.INFO],
    [LogLevel.Warn, SeverityNumber.WARN],
    [LogLevel.Error, SeverityNumber.ERROR],
  ])('maps the level %p to severity number %p', (level, severityNumber) => {
    sink.write({
      level,
      message: 'm',
      timestamp: TIMESTAMP,
      service: 'svc',
      fields: {},
    });

    expect(logger.emitted[0]).toMatchObject({
      severityNumber,
      severityText: level,
      body: 'm',
      timestamp: TIMESTAMP,
    });
  });

  it('keeps trace_id and span_id out of the attributes', () => {
    sink.write({
      level: LogLevel.Info,
      message: 'm',
      timestamp: TIMESTAMP,
      service: 'svc',
      fields: {
        [LogField.TraceId]: '0af7651916cd43dd8448eb211c80319c',
        [LogField.SpanId]: 'b7ad6b7169203331',
        tenant_id: 't-1',
      },
    });

    expect(logger.emitted[0]?.attributes).toEqual({ tenant_id: 't-1' });
  });

  it('serializes objects and arrays and omits null and undefined values', () => {
    sink.write({
      level: LogLevel.Info,
      message: 'm',
      timestamp: TIMESTAMP,
      service: 'svc',
      fields: {
        order: { id: 'o-1', lines: [1, 2] },
        nothing: null,
        missing: undefined,
        count: 3,
        retried: false,
      },
    });

    expect(logger.emitted[0]?.attributes).toEqual({
      order: '{"id":"o-1","lines":[1,2]}',
      count: 3,
      retried: false,
    });
  });

  it('adds the context as an attribute when the record has one', () => {
    sink.write({
      level: LogLevel.Info,
      message: 'm',
      timestamp: TIMESTAMP,
      service: 'svc',
      context: 'billing',
      fields: {},
    });

    expect(logger.emitted[0]?.attributes).toEqual({
      [LogField.Context]: 'billing',
    });
  });
});
