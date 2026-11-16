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

/** Spans propios de la plataforma sobre un `Tracer` inyectable. Sin SDK registrado es un no-op. */
export class Tracing {
  /** Nombre del instrumentation scope de los spans propios. */
  static readonly SCOPE = '@platform/observability';

  constructor(
    private readonly redactor: Redactor,
    private readonly tracer: Tracer = trace.getTracer(Tracing.SCOPE),
  ) {}

  /**
   * Ejecuta `fn` dentro de un span activo y lo cierra al terminar. Si `fn`
   * lanza o su promesa se rechaza, marca el span con el error y lo relanza.
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
   * Marca el span con el error: estado `ERROR`, `error.type`, `error.code` y un
   * evento de excepción con mensaje y stack redactados. El mensaje de estado es
   * el código o el nombre, nunca el texto del error.
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

  /** Ids del span activo, o `undefined` si no hay span válido. */
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
