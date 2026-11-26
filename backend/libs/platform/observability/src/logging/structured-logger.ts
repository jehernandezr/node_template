import { LogField } from './log-field.enum.js';
import { LogLevel } from './log-level.enum.js';
import { LoggerPort } from './logger.port.js';
import type { StructuredLoggerOptions } from './structured-logger.options.js';

/**
 * Builds each log with automatic redaction and trace and request context, and
 * hands it to the `LogSink`. It does not know where it goes: the destination is a strategy.
 */
export class StructuredLogger extends LoggerPort {
  private static readonly LEVEL_RANK: Record<LogLevel, number> = {
    [LogLevel.Debug]: 0,
    [LogLevel.Info]: 1,
    [LogLevel.Warn]: 2,
    [LogLevel.Error]: 3,
  };
  private static readonly RESERVED_FIELDS = new Set<string>(
    Object.values(LogField),
  );

  private readonly bindings: Record<string, unknown>;

  constructor(
    private readonly options: StructuredLoggerOptions,
    bindings: Record<string, unknown> = {},
  ) {
    super();
    this.bindings = { ...bindings };
  }

  override debug(message: string, fields?: Record<string, unknown>): void {
    this.write(LogLevel.Debug, message, fields);
  }

  override info(message: string, fields?: Record<string, unknown>): void {
    this.write(LogLevel.Info, message, fields);
  }

  override warn(message: string, fields?: Record<string, unknown>): void {
    this.write(LogLevel.Warn, message, fields);
  }

  override error(message: string, fields?: Record<string, unknown>): void {
    this.write(LogLevel.Error, message, fields);
  }

  override child(bindings: Record<string, unknown>): LoggerPort {
    return new StructuredLogger(this.options, {
      ...this.bindings,
      ...bindings,
    });
  }

  /**
   * A log inside a span without an open context (a job, a library) is also linked to the trace.
   */
  private write(
    level: LogLevel,
    message: string,
    fields: Record<string, unknown> = {},
  ): void {
    if (!this.shouldEmit(level)) {
      return;
    }
    const sanitized = this.options.redactor.redact({
      ...this.bindings,
      ...fields,
    }) as Record<string, unknown>;
    const callerFields = Object.fromEntries(
      Object.entries(sanitized).filter(
        ([key]) => !StructuredLogger.RESERVED_FIELDS.has(key),
      ),
    );
    const ctx = this.options.contextStore.current();
    const span =
      ctx === undefined ? this.options.tracing.activeIds() : undefined;
    const traceId = ctx?.traceId ?? span?.traceId;
    const contextFields: Record<string, unknown> = {
      [LogField.TraceId]: traceId,
      [LogField.SpanId]: ctx?.spanId ?? span?.spanId,
      [LogField.TraceIdInvalid]:
        traceId === undefined && ctx?.traceIdInvalid === true
          ? true
          : undefined,
      [LogField.ExternalTraceId]: ctx?.externalTraceId,
      [LogField.TenantId]: ctx?.tenantId,
      [LogField.ActorId]: ctx?.actorId,
      [LogField.ActorType]: ctx?.actorType,
      [LogField.UserId]: ctx?.userId,
      [LogField.Region]: ctx?.region,
    };
    this.options.sink.write({
      level,
      message: this.options.redactor.redactString(message),
      timestamp: this.options.clock.now(),
      service: this.options.service,
      ...(this.options.context !== undefined && {
        context: this.options.context,
      }),
      fields: Object.fromEntries(
        Object.entries({ ...callerFields, ...contextFields }).filter(
          ([, value]) => value !== undefined,
        ),
      ),
    });
  }

  private shouldEmit(level: LogLevel): boolean {
    if (
      StructuredLogger.LEVEL_RANK[level] >=
      StructuredLogger.LEVEL_RANK[this.options.level]
    ) {
      return true;
    }
    if (level !== LogLevel.Debug) {
      return false;
    }
    const inDebugContext =
      this.options.context !== undefined &&
      this.options.debugContexts.includes(this.options.context);
    return (
      inDebugContext ||
      this.options.contextStore.current()?.debugSampled === true
    );
  }
}
