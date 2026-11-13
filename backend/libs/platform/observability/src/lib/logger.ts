import {
  logs,
  SeverityNumber,
  type AttributeValue,
  type Attributes,
  type Logger as OtelLogger,
} from '@opentelemetry/api';
import { LogLevel } from '@platform/config';
import { redact, redactString } from './redaction.js';
import { activeSpanIds, RequestContext } from './request-context.js';

export { LogLevel } from '@platform/config';

/** Nombre del instrumentation scope con el que el logger emite logs OTel. */
export const OTEL_LOGGER_SCOPE = '@platform/observability';

/**
 * Campos fijos de cada línea. `trace_id` y `span_id` usan los nombres y el
 * formato (32/16 hex) de OpenTelemetry, así OpenObserve abre la traza desde
 * el log. Un campo del llamador con el mismo nombre se descarta.
 */
export enum LogField {
  Timestamp = 'timestamp',
  Level = 'level',
  Service = 'service',
  Context = 'context',
  Message = 'message',
  TraceId = 'trace_id',
  SpanId = 'span_id',
  /** El contexto traía un `traceId` malformado; nunca se escribe el valor. */
  TraceIdInvalid = 'trace_id_invalid',
  ExternalTraceId = 'external_trace_id',
  TenantId = 'tenant_id',
  ActorId = 'actor_id',
  ActorType = 'actor_type',
  UserId = 'user_id',
  Region = 'region',
}

export interface LoggerPort {
  debug(message: string, fields?: Record<string, unknown>): void;
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): LoggerPort;
}

export interface JsonLoggerOptions {
  service: string;
  level: LogLevel;
  /** Módulos (valores de `context`) que emiten debug sin importar el nivel. */
  debugContexts?: string[];
  context?: string;
  /** Recibe cada línea JSON sin salto de línea final. Por defecto, process.stdout. */
  sink?: (line: string) => void;
  clock?: () => Date;
  /**
   * Además de la línea JSON, emite cada log como log OTel con el contexto del
   * span activo, para exportarlo por OTLP. Sin SDK registrado es un no-op.
   * Por defecto `true`.
   */
  otelLogs?: boolean;
}

const LEVEL_RANK: Record<LogLevel, number> = {
  [LogLevel.Debug]: 0,
  [LogLevel.Info]: 1,
  [LogLevel.Warn]: 2,
  [LogLevel.Error]: 3,
};

const SEVERITY: Record<LogLevel, SeverityNumber> = {
  [LogLevel.Debug]: SeverityNumber.DEBUG,
  [LogLevel.Info]: SeverityNumber.INFO,
  [LogLevel.Warn]: SeverityNumber.WARN,
  [LogLevel.Error]: SeverityNumber.ERROR,
};

const RESERVED_FIELDS = new Set<string>(Object.values(LogField));

/** Campos de traza y contexto de la línea, ya validados. */
function contextFields(): Record<string, unknown> {
  const ctx = RequestContext.current();
  const span = activeSpanIds();
  const traceId = span?.traceId ?? ctx?.traceId;
  const spanId = span?.spanId ?? ctx?.spanId;
  return {
    [LogField.TraceId]: traceId,
    [LogField.SpanId]: spanId,
    [LogField.TraceIdInvalid]:
      traceId === undefined && ctx?.traceIdInvalid === true ? true : undefined,
    [LogField.ExternalTraceId]: ctx?.externalTraceId,
    [LogField.TenantId]: ctx?.tenantId,
    [LogField.ActorId]: ctx?.actorId,
    [LogField.ActorType]: ctx?.actorType,
    [LogField.UserId]: ctx?.userId,
    [LogField.Region]: ctx?.region,
  };
}

function toAttributeValue(value: unknown): AttributeValue | undefined {
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

/** Escribe un objeto JSON por línea con contexto de traza y redacción automática. */
export class JsonLogger implements LoggerPort {
  private readonly bindings: Record<string, unknown>;
  private readonly otel: OtelLogger | undefined;

  constructor(
    private readonly options: JsonLoggerOptions,
    bindings: Record<string, unknown> = {},
  ) {
    this.bindings = { ...bindings };
    this.otel =
      options.otelLogs === false
        ? undefined
        : logs.getLogger(OTEL_LOGGER_SCOPE);
  }

  debug(message: string, fields?: Record<string, unknown>): void {
    this.write(LogLevel.Debug, message, fields);
  }

  info(message: string, fields?: Record<string, unknown>): void {
    this.write(LogLevel.Info, message, fields);
  }

  warn(message: string, fields?: Record<string, unknown>): void {
    this.write(LogLevel.Warn, message, fields);
  }

  error(message: string, fields?: Record<string, unknown>): void {
    this.write(LogLevel.Error, message, fields);
  }

  child(bindings: Record<string, unknown>): LoggerPort {
    return new JsonLogger(this.options, { ...this.bindings, ...bindings });
  }

  private write(
    level: LogLevel,
    message: string,
    fields: Record<string, unknown> = {},
  ): void {
    if (!this.shouldEmit(level)) {
      return;
    }
    const sanitized = redact({ ...this.bindings, ...fields }) as Record<
      string,
      unknown
    >;
    for (const key of Object.keys(sanitized)) {
      if (RESERVED_FIELDS.has(key)) {
        delete sanitized[key];
      }
    }
    const timestamp = (this.options.clock ?? (() => new Date()))();
    const safeMessage = redactString(message);
    const context = contextFields();

    const line = JSON.stringify({
      ...sanitized,
      [LogField.Timestamp]: timestamp.toISOString(),
      [LogField.Level]: level,
      [LogField.Service]: this.options.service,
      [LogField.Context]: this.options.context,
      [LogField.Message]: safeMessage,
      ...context,
    });
    (this.options.sink ?? defaultSink)(line);

    this.emitOtel(level, safeMessage, timestamp, { ...sanitized, ...context });
  }

  private emitOtel(
    level: LogLevel,
    message: string,
    timestamp: Date,
    fields: Record<string, unknown>,
  ): void {
    if (this.otel === undefined) {
      return;
    }
    const attributes: Attributes = {};
    for (const [key, value] of Object.entries(fields)) {
      // trace_id y span_id viajan en el contexto del registro OTel, no como atributos.
      if (key === LogField.TraceId || key === LogField.SpanId) {
        continue;
      }
      const attribute = toAttributeValue(value);
      if (attribute !== undefined) {
        attributes[key] = attribute;
      }
    }
    if (this.options.context !== undefined) {
      attributes[LogField.Context] = this.options.context;
    }
    this.otel.emit({
      timestamp,
      severityNumber: SEVERITY[level],
      severityText: level,
      body: message,
      attributes,
    });
  }

  private shouldEmit(level: LogLevel): boolean {
    if (LEVEL_RANK[level] >= LEVEL_RANK[this.options.level]) {
      return true;
    }
    if (level !== LogLevel.Debug) {
      return false;
    }
    const inDebugContext =
      this.options.context !== undefined &&
      (this.options.debugContexts ?? []).includes(this.options.context);
    return inDebugContext || RequestContext.current()?.debugSampled === true;
  }
}

function defaultSink(line: string): void {
  process.stdout.write(`${line}\n`);
}
