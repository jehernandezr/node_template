import {
  logs,
  SeverityNumber,
  type AttributeValue,
  type Attributes,
  type Logger as OtelLogger,
} from '@opentelemetry/api';
import { LogField } from './log-field.enum.js';
import { LogLevel } from './log-level.enum.js';
import { LogSink } from './log-sink.js';
import type { LogRecord } from './log-record.js';

/**
 * Un log OTel con el contexto del span activo, que el SDK exporta por OTLP al
 * Collector. Sin SDK registrado se pierde: usarlo solo con la telemetría encendida.
 */
export class OtlpLogSink extends LogSink {
  /** Nombre del instrumentation scope con el que el sink emite logs OTel. */
  static readonly SCOPE = '@platform/observability';

  private static readonly SEVERITY: Record<LogLevel, SeverityNumber> = {
    [LogLevel.Debug]: SeverityNumber.DEBUG,
    [LogLevel.Info]: SeverityNumber.INFO,
    [LogLevel.Warn]: SeverityNumber.WARN,
    [LogLevel.Error]: SeverityNumber.ERROR,
  };

  constructor(
    private readonly logger: OtelLogger = logs.getLogger(OtlpLogSink.SCOPE),
  ) {
    super();
  }

  write(record: LogRecord): void {
    const attributes: Attributes = {};
    for (const [key, value] of Object.entries(record.fields)) {
      // trace_id y span_id viajan en el contexto del registro OTel, no como atributos.
      if (key === LogField.TraceId || key === LogField.SpanId) {
        continue;
      }
      const attribute = OtlpLogSink.toAttributeValue(value);
      if (attribute !== undefined) {
        attributes[key] = attribute;
      }
    }
    if (record.context !== undefined) {
      attributes[LogField.Context] = record.context;
    }
    this.logger.emit({
      timestamp: record.timestamp,
      severityNumber: OtlpLogSink.SEVERITY[record.level],
      severityText: record.level,
      body: record.message,
      attributes,
    });
  }

  private static toAttributeValue(value: unknown): AttributeValue | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return value;
    }
    return JSON.stringify(value);
  }
}
