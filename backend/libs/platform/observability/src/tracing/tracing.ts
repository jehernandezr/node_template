import {
  isSpanContextValid,
  SpanKind,
  SpanStatusCode,
  trace,
  TraceFlags,
  type Span,
  type Tracer,
} from '@opentelemetry/api';
import { ErrorDescriptor } from '@platform/kernel';
import type { ActiveSpanIds } from '../context/active-span-ids.js';
import type { Redactor } from '../redaction/redactor.js';
import { SpanAttribute } from './span-attribute.enum.js';
import type { WithSpanOptions } from './with-span-options.js';

/** Platform's own spans over an injectable `Tracer`. A no-op without a registered SDK. */
export class Tracing {
  /** Instrumentation scope name of the platform's own spans. */
  static readonly SCOPE = '@platform/observability';

  constructor(
    private readonly redactor: Redactor,
    private readonly tracer: Tracer = trace.getTracer(Tracing.SCOPE),
  ) {}

  /**
   * Runs `fn` inside an active span and closes it when done. If `fn`
   * throws or its promise rejects, marks the span with the error and rethrows it.
   * @param name Span name.
   * @param fn Work inside the span.
   * @param options Kind and attributes.
   * @returns What `fn` returns.
   */
  withSpan<T>(
    name: string,
    fn: (span: Span) => T | Promise<T>,
    options: WithSpanOptions = {},
  ): Promise<T> {
    return this.tracer.startActiveSpan(
      name,
      {
        kind: options.kind ?? SpanKind.INTERNAL,
        attributes: options.attributes,
      },
      async (span) => {
        try {
          return await fn(span);
        } catch (error) {
          this.recordError(span, error);
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }

  /**
   * Marks the span with the error: `ERROR` status, `error.type`, `error.code` and an
   * exception event with redacted message and stack. The status message is
   * the code or the name, never the error text.
   * @param span Span to mark.
   * @param error Error to record.
   */
  recordError(span: Span, error: unknown): void {
    const description = ErrorDescriptor.describe(error);
    const type = description.code ?? description.name;
    span.setAttribute(SpanAttribute.ErrorType, type);
    if (description.code !== undefined) {
      span.setAttribute(SpanAttribute.ErrorCode, description.code);
    }
    span.recordException({
      name: description.name,
      message: this.redactor.redactString(description.message),
      ...(error instanceof Error &&
        error.stack !== undefined && {
          stack: this.redactor.redactString(error.stack),
        }),
    });
    span.setStatus({ code: SpanStatusCode.ERROR, message: type });
  }

  /**
   * Ids of the active span, or `undefined` if there is no valid span.
   * @returns The ids, or `undefined`.
   */
  activeIds(): ActiveSpanIds | undefined {
    const spanContext = trace.getActiveSpan()?.spanContext();
    if (spanContext === undefined || !isSpanContextValid(spanContext)) {
      return undefined;
    }
    return {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
      sampled:
        (spanContext.traceFlags & TraceFlags.SAMPLED) === TraceFlags.SAMPLED,
    };
  }
}
